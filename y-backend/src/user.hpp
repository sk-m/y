#pragma once

#include <iostream>
#include <openssl/rand.h>
#include <regex>
#include <drogon/drogon.h>

#include "db.hpp"
#include "util.cpp"

#include "../third_party/fastpbkdf2/fastpbkdf2.h"

// TODO @check is this ok? Should we increase/decrease these numbers?
#define PASSWORD_SALT_SIZE_BYTES 64
#define PASSWORD_KEY_SIZE_BYTES 64
#define PASSWORD_HASH_ITERATIONS 200000
#define USER_SESSION_TOKEN_ITERATIONS 10000

namespace User {
    typedef enum: unsigned char {
        OK = 0,

        USERNAME_TAKEN = 1,
        PASSWORD_LENGTH = 2,
        USERNAME_FORMAT = 3,
        USER_NOT_FOUND = 4,
        PASSWORD_INCORRECT = 5,
        PASSWORD_HASHING_ALGORITHM_UNSUPPORTED = 6,

        INTERNAL = 255
    } ErrorCode;

    struct User {
        unsigned int id;

        char* username;
        char* password;
        char* last_login;

        bool ok = false;
        PGresult* _result;
    };

    struct UserSession {
        char* session_id;

        unsigned int user_id;
        char* current_ip;
        char* ip_range;
        char* token_hash;
        char* token_salt;
        unsigned int token_iterations;
        trantor::Date valid_until;
        char* device;

        char token_cleartext[129];

        bool ok = false;
        PGresult* _result;
    };

    User from_db(PGresult* result);
    UserSession session_from_db(PGresult* result);

    bool is_username_taken(const char* username);
    std::tuple<User, Error> user_compare_passwords(const char* username, const char* password);

    std::tuple<unsigned int, Error> user_create(const char* username, const char* password);
    std::tuple<UserSession, Error> session_create(unsigned int user_id, const drogon::HttpRequestPtr& req);
}

User::User User::from_db(PGresult* result) {
    User user;

    // Check the results first
    if(PQresultStatus(result) != ExecStatusType::PGRES_TUPLES_OK || PQnfields(result) == 0 || PQntuples(result) == 0) {
        PQclear(result);
        return user;
    }
   
    // Create the user object
    user.ok = true;
    user._result = std::move(result);

    // TODO @refactor @performance I'm sure this can be more elegant
    user.id = std::stoi(PQgetvalue(user._result, 0, PQfnumber(user._result, "user_id")));
    user.username = PQgetvalue(user._result, 0, PQfnumber(user._result, "user_username"));
    user.password = PQgetvalue(user._result, 0, PQfnumber(user._result, "user_password"));
    user.last_login = PQgetvalue(user._result, 0, PQfnumber(user._result, "user_last_login"));

    return user;
}

User::UserSession User::session_from_db(PGresult* result) {
    UserSession session;

    // Check the results first
    if(PQresultStatus(result) != ExecStatusType::PGRES_TUPLES_OK || PQnfields(result) == 0 || PQntuples(result) == 0) {
        PQclear(result);
        return session;
    }
   
    // Create the session object
    session.ok = true;
    session._result = std::move(result);

    const auto valid_until_raw = std::string(PQgetvalue(session._result, 0, PQfnumber(session._result, "session_valid_until")));

    // TODO @refactor @performance I'm sure this can be more elegant
    session.session_id = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_id"));
    session.user_id = std::stoi(PQgetvalue(session._result, 0, PQfnumber(session._result, "session_user_id")));
    session.current_ip = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_current_ip"));
    session.ip_range = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_ip_range"));
    session.token_hash = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_token_hash"));
    session.token_salt = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_token_salt"));
    session.token_iterations = std::stoi(PQgetvalue(session._result, 0, PQfnumber(session._result, "session_token_iterations")));

    // TODO* @performance @minor This is *extremely* minor, but sometimes we call this function right after creating a new session
    // (from Postgres' INSERT INTO user_sessions ... RETURNING *). This means, that we already have a Date instance on our
    // hands, but instead of using it, we rely on this function, which will *parse* the timestamp that we have just created
    // and sent to the database.

    // So, in other words, we create a new Date, *stringify it*, insert into the database, call this function and *parse the
    // string timestamp back into Date*
    // This has a pretty much non-existent impact on the performance, but it doesn't feel good...

    session.valid_until = trantor::Date::fromDbStringLocal(valid_until_raw);
    session.device = PQgetvalue(session._result, 0, PQfnumber(session._result, "session_device"));

    return session;
}

bool User::is_username_taken(const char* username) {
    const char* const sql_params[1] = { username };
    auto result = DB::exec_prepared("user_is_username_taken", sql_params, 1);
    
    const bool is_taken = PQgetvalue(result, 0, 0)[0] != '0';

    PQclear(result);
    return is_taken;
}

std::tuple<User::User, Error> User::user_compare_passwords(const char* username, const char* password) {
    // Get the user
    const char* const sql_params[1] = { username };
    auto user_result = DB::exec_prepared("user_get_by_username", sql_params, 1);

    User user = from_db(user_result);

    if(!user.ok) {
        // TODO @robustness !ok does not necessarily mean that the user was not found. Some other error might be the case
        return std::make_tuple(user, Error {
            ErrorCode::USER_NOT_FOUND,
            "User was not found." 
        });
    }

    // TODO @cleanup @DRY move into util.cpp?
    std::vector<std::string> password_parts;
    std::string token;
    std::istringstream parts_stream(user.password);

    while(std::getline(parts_stream, token, ';')) {
        password_parts.push_back(token);
    }

    // Check which algorithm we are using
    if(password_parts[0] == "pbkdf2") {
        const auto db_hash_hex = password_parts[1];
        const auto db_salt_hex = password_parts[2];
        const auto db_iterations_str = password_parts[3];
    
        const auto hash_size = db_hash_hex.length() / 2;
        const auto salt_size = db_salt_hex.length() / 2;

        // Transform hex strings into byte arrays
        auto db_hash = hex_to_string(db_hash_hex);
        auto db_salt = hex_to_string(db_salt_hex);

        // Try to hash the password that was provided
        unsigned char hash_out_raw[PASSWORD_KEY_SIZE_BYTES];

        fastpbkdf2_hmac_sha512((const unsigned char*)password, strlen(password),
                            (const unsigned char*)db_salt.c_str(), db_salt.size(),
                            std::stoi(db_iterations_str),
                            hash_out_raw, PASSWORD_KEY_SIZE_BYTES);

        // Compare the hashes
        const auto password_correct = strcmp(db_hash.c_str(), reinterpret_cast<char*>(hash_out_raw)) == 0;
        
        if(password_correct) {
            return std::make_tuple(user, Error{ 0, nullptr });
        } else {
            return std::make_tuple(user, Error {
                ErrorCode::PASSWORD_INCORRECT,
                "Password is incorrect." 
            });
        }
    }

    return std::make_tuple(user, Error {
        ErrorCode::PASSWORD_HASHING_ALGORITHM_UNSUPPORTED,
        "Password hashing algorithm is (no longer) supported. Please, contact administrators." 
    });
}

std::tuple<unsigned int, Error> User::user_create(const char* username, const char* password) {
    // Check the data
    const auto password_len = strlen(password);

    if(password_len < 8 || password_len > 2048) {
        return std::make_tuple(0, Error{ ErrorCode::PASSWORD_LENGTH, "Invalid password format." });
    }

    std::cmatch username_m;
    if(!std::regex_match(username, username_m, std::regex("^[A-Za-z0-9_]{1,64}$"))) {
        return std::make_tuple(0, Error{ ErrorCode::USERNAME_FORMAT, "Invalid username format." });
    }

    // TODO @cleanup @refactor @performance We do not check if the username is already taken
    // This is okay, as we will get an error from the INSERT query if the username is already taken, but in that case, we have
    // already spent some time and processing power on hashing a password that will not go anywhere
    // In other words, we figure out if the username is okay only AFTER we have hashed the password

    // Generate a salt for the password
    // TODO @cleanup I think we can skip the initialization of the array
    unsigned char salt_raw[PASSWORD_SALT_SIZE_BYTES];
    RAND_bytes(salt_raw, PASSWORD_SALT_SIZE_BYTES);

    // Hash the password
    // TODO @cleanup I think we can skip the initialization of the array
    unsigned char hash_out_raw[PASSWORD_KEY_SIZE_BYTES];

    fastpbkdf2_hmac_sha512((const unsigned char*)password, password_len,
                           salt_raw, PASSWORD_SALT_SIZE_BYTES,
                           PASSWORD_HASH_ITERATIONS,
                           hash_out_raw, PASSWORD_KEY_SIZE_BYTES);

    // Create a `password` string for the database
    // `pbkdf2;*hash*;*salt*;*iterations_count*;`

    auto hash_hex = string_to_hex(std::string(reinterpret_cast<char*>(hash_out_raw), PASSWORD_KEY_SIZE_BYTES));
    auto salt_hex = string_to_hex(std::string(reinterpret_cast<char*>(salt_raw), PASSWORD_SALT_SIZE_BYTES));

    const auto db_password_str = fmt::format("pbkdf2;{};{};{};", hash_hex, salt_hex, PASSWORD_HASH_ITERATIONS);

    const char* const sql_params[2] = { username, db_password_str.c_str() };
    auto result = DB::exec_prepared("user_create", sql_params, 2);

    if(PQresultStatus(result) != PGRES_TUPLES_OK) {
        // Check the type of the error
        const auto error_type = PQresultErrorField(result, PG_DIAG_SQLSTATE);

        // unique_violation (23505), username is probably taken 
        if(std::stoi(error_type) == 23505) {
            PQclear(result);
            return std::make_tuple(0, Error{ ErrorCode::USERNAME_TAKEN, "Username is already taken." });
        } else {
            const auto error_message = PQresultErrorMessage(result);

            // TODO @log
            std::cout << "Could not create a user from User::user_create()\n" << error_message;
        }

        PQclear(result);
        return std::make_tuple(0, Error{ ErrorCode::INTERNAL, "Error creating a new user." });
    }

    // Get the user id
    const auto user_id = std::stoi(PQgetvalue(result, 0, 0));

    PQclear(result);
    return std::make_tuple(user_id, Error{ 0, nullptr });
}

std::tuple<User::UserSession, Error> User::session_create(unsigned int user_id, const drogon::HttpRequestPtr& req) {
    // Generate a session token & salt
    unsigned char session_salt_raw[64];
    RAND_bytes(session_salt_raw, 64);

    unsigned char session_token_raw[64];
    RAND_bytes(session_token_raw, 64);

    // Hash the token
    // TODO @cleanup I think we can skip the initialization of the array
    unsigned char session_token_hash_out_raw[64];

    fastpbkdf2_hmac_sha512(session_token_raw, 64,
                           session_salt_raw, 64,
                           USER_SESSION_TOKEN_ITERATIONS,
                           session_token_hash_out_raw, 64);

    auto token_cleartext_hex = string_to_hex(std::string(reinterpret_cast<char*>(session_token_raw), 64));
    auto token_hash_hex = string_to_hex(std::string(reinterpret_cast<char*>(session_token_hash_out_raw), 64));
    auto token_salt_hex = string_to_hex(std::string(reinterpret_cast<char*>(session_salt_raw), 64));

    // Get some info about a client
    const auto client_ip = req->getPeerAddr().toIp();

    // Create an expiration date
    const auto unix_timestamp_us = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    // TODO @improvement allow admins to set a custom session duration (instead of 1.5552e13 us)
    long long session_duration_us = unix_timestamp_us + 1.5552e13;

    auto session_expiration_date = trantor::Date(session_duration_us).toDbStringLocal();

    // Create an expiration date string for the database
    char session_expiration_date_str[session_expiration_date.size() + 1];
    strncpy(session_expiration_date_str, session_expiration_date.c_str(), session_expiration_date.size());
    session_expiration_date_str[session_expiration_date.size()] = '\0';

    // TODO @incomplete @placeholder ip range & device are placeholders
    const char* const sql_params[8] = {
        std::to_string(user_id).c_str(),
        client_ip.c_str(),
        fmt::format("{}/32", client_ip).c_str(),
        token_hash_hex.c_str(),
        token_salt_hex.c_str(),
        std::to_string(USER_SESSION_TOKEN_ITERATIONS).c_str(),
        session_expiration_date_str,
        "Some device, Windows 11"
    };

    // Write the session to the database
    auto result = DB::exec_prepared("user_create_session", sql_params, 8);

    // Check for errors
    if(PQresultStatus(result) != PGRES_TUPLES_OK) {
        const auto error_type = PQresultErrorField(result, PG_DIAG_SQLSTATE);
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not create a new user session from User::session_create()\n" << error_message;

        PQclear(result);
        return std::make_tuple(UserSession{}, Error{ ErrorCode::INTERNAL, "Error creating a new user session." });
    }

    auto user_session = session_from_db(result);
    
    // Also save the cleartext token (the value that will reside in the user's y_session cookie)
    strncpy(user_session.token_cleartext, token_cleartext_hex.c_str(), 128);
    user_session.token_cleartext[128] = '\0';

    return std::make_tuple(user_session, Error{ 0, nullptr });
}
