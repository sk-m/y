#pragma once

#include <iostream>
#include <openssl/rand.h>
#include <regex>
#include <drogon/drogon.h>
#include <functional>

#include "../third_party/fastpbkdf2/fastpbkdf2.h"

#include "db.hpp"
#include "util.cpp"

#define INSANELY_INSECURE_SCARY_FLAG_DO_NOT_EVER_ENABLE 0

// TODO @check is this ok? Should we increase/decrease these numbers?
#define PASSWORD_SALT_SIZE_BYTES 64
#define PASSWORD_KEY_SIZE_BYTES 64
#define PASSWORD_HASH_ITERATIONS 200000
#define USER_SESSION_TOKEN_ITERATIONS 10000

typedef enum: unsigned char {
    OK = 0,

    USERNAME_TAKEN = 1,
    PASSWORD_LENGTH = 2,
    USERNAME_FORMAT = 3,
    USER_NOT_FOUND = 4,
    PASSWORD_INCORRECT = 5,
    PASSWORD_HASHING_ALGORITHM_UNSUPPORTED = 6,

    SESSION_INVALID = 20,
    SESSION_IP_NOT_ALLOWED = 21,
    SESSION_EXPIRED = 22,

    INTERNAL = 255
} UserError;

// TODO @move to a separate file
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

    static UserSession from_result(PGresult* result, int row);
    static std::vector<UserSession> from_result_many(PGresult* result);
};

struct User {
    // TODO @rename to user_id
    unsigned int id;

    char* username;
    char* password;

    char* last_login;

    static User from_result(PGresult* result, int row);
};

// bool user_is_username_taken(const char* username) {
//     const char* const sql_params[1] = { username };
//     auto result = DB::exec_prepared("user_is_username_taken", sql_params, 1);
    
//     const bool is_taken = PQgetvalue(result, 0, 0)[0] != '0';

//     PQclear(result);
//     return is_taken;
// }

[[nodiscard]] User User::from_result(PGresult* result, int row = 0) {
    User user;

    // TODO @refactor @performance I'm sure this can be more elegant
    user.id = std::stoi(PQgetvalue(result, row, PQfnumber(result, "user_id")));
    user.username = PQgetvalue(result, row, PQfnumber(result, "user_username"));
    user.password = PQgetvalue(result, row, PQfnumber(result, "user_password"));
    user.last_login = PQgetvalue(result, row, PQfnumber(result, "user_last_login"));

    return user;
}

[[nodiscard]] UserSession UserSession::from_result(PGresult* result, int row = 0) {
    UserSession session;

    const auto valid_until_raw = std::string(PQgetvalue(result, row, PQfnumber(result, "session_valid_until")));

    // TODO @refactor @performance I'm sure this can be more elegant
    session.session_id = PQgetvalue(result, row, PQfnumber(result, "session_id"));
    session.user_id = std::stoi(PQgetvalue(result, row, PQfnumber(result, "session_user_id")));
    session.current_ip = PQgetvalue(result, row, PQfnumber(result, "session_current_ip"));
    session.ip_range = PQgetvalue(result, row, PQfnumber(result, "session_ip_range"));
    session.token_hash = PQgetvalue(result, row, PQfnumber(result, "session_token_hash"));
    session.token_salt = PQgetvalue(result, row, PQfnumber(result, "session_token_salt"));
    session.token_iterations = std::stoi(PQgetvalue(result, row, PQfnumber(result, "session_token_iterations")));

    // TODO* @performance @minor This is *extremely* minor, but sometimes we call this function right after creating a new session
    // (from Postgres' INSERT INTO user_sessions ... RETURNING *). This means, that we already have a Date instance on our
    // hands, but instead of using it, we rely on this function, which will *parse* the timestamp that we have just created
    // and sent to the database.

    // So, in other words, we create a new Date, *stringify it*, insert into the database, call this function and *parse the
    // string timestamp back into Date*
    // This has a pretty much non-existent impact on the performance, but it doesn't feel good...

    session.valid_until = trantor::Date::fromDbStringLocal(valid_until_raw);
    session.device = PQgetvalue(result, row, PQfnumber(result, "session_device"));

    return session;
}

[[nodiscard]] std::vector<UserSession> UserSession::from_result_many(PGresult* result) {
    std::vector<UserSession> sessions;

    const auto rows_n = PQntuples(result);
    sessions.reserve(rows_n);

    for(int i = 0; i < rows_n; i++) {
        sessions.push_back(UserSession::from_result(result, i));
    }

    return sessions;
}

/**
 * @brief Get the user by their username
 * 
 * UserErrors that can be returned:
 * \li USER_NOT_FOUND;
 * 
 * @param username target user's username
 */
CleanableResult<User> user_get_by_username(const char* username) {
    const char* const sql_params[1] = { username };
    auto user_result = DB::exec_prepared("user_get_by_username", sql_params, 1);

    if(!DB::is_result_ok(user_result)) {
        return CleanableResult(User {}, Status {
            UserError::USER_NOT_FOUND,
            "Could not find the user." 
        });
    }

    auto user = User::from_result(user_result);

    return CleanableResult(user, DEFAULT_CLEANUP_FUNC(user_result));
}

/**
 * @brief Get some basic info about the user, given a `y_session` cookie value.
 * 
 * If this function returns an OK status with a user_id and user_username - that means that the `y_session` cookie is correct and the user's
 * browser holds a valid session for the user, the id of which will be stored in the User object.
 * 
 * If *anything* does not look right (there is no session with such id, the token is not valid, the session was destroyed. etc) - a
 * SESSION_INVALID error code will be returned 
 * 
 * UserErrors that can be returned:
 * 
 * \li SESSION_INVALID;
 * \li SESSION_IP_NOT_ALLOWED;
 * 
 * @param session_cookie_value The value of the `y_session` cookie (format - `session_id[36]:session_token[128]`)
 * @param req Drogon's req object
 * @param skip_additional_checks Set to true to *only* check the session token, skipping ip range checks and such.
 * @param readonly Set to true to skip all database updates. If true, this function will just check the session and return you the user
 * without doing any updating, like the current_ip, etc. Basically, we will not write anything to the database if true
 *
 * @return On success, the User object will have it's `id` and `username` fields set.
 */
CleanableResult<std::tuple<User, UserSession>> user_get_from_session(const char* session_cookie_value, const drogon::HttpRequestPtr& req, bool skip_additional_checks = false, bool readonly = false) {
    User user{};
    
    // Make sure we have a cookie value and not just an empty string
    if(strnlen(session_cookie_value, 256) < 128) {
        return CleanableResult(std::make_tuple(user, UserSession{}), Status {
            UserError::SESSION_INVALID,
            "Session token is invalid." 
        });
    }

    // Extract the session_id and cleartext session_token from the `y_sessions` cookie
    // TODO @cleanup @DRY move into util.cpp?
    std::vector<std::string> session_cookie_parts;
    std::string token;
    std::istringstream parts_stream(session_cookie_value);

    // TODO @performance we can do better than that. We know the exact lenght of both parts, so there is no reason to search for a delimiter
    // and create a whole vector! That's wasteful and lazy.

    while(std::getline(parts_stream, token, ':')) {
        session_cookie_parts.push_back(token);
    }

    // Check for malformed cookie value. There should be exactly two parts - session_id & session_token
    if(session_cookie_parts.size() != 2) {
        return CleanableResult(std::make_tuple(user, UserSession{}), Status {
            UserError::SESSION_INVALID,
            "Session is invalid." 
        });
    }

    const auto session_id = session_cookie_parts[0];
    const auto session_cleartext_token = session_cookie_parts[1];

    // The token should be exactly 128 bytes long (64 byte-long token in a hex format)
    if(session_cleartext_token.size() != 128) {
        return CleanableResult(std::make_tuple(user, UserSession{}), Status {
            UserError::SESSION_INVALID,
            "Session token is invalid." 
        });
    }

    // Find the session by its session_id
    const char* const sql_params[1] = { session_id.c_str() };
    auto session_result = DB::exec_prepared("session_get_by_id", sql_params, 1);

    // Did we find a session with such session_id?
    if(!DB::is_result_ok(session_result)) {
        return CleanableResult(std::make_tuple(user, UserSession{}), Status {
            UserError::SESSION_INVALID,
            "Session is invalid." 
        });
    }

    auto session = UserSession::from_result(session_result);

    #if INSANELY_INSECURE_SCARY_FLAG_DO_NOT_EVER_ENABLE
        const auto session_token_valid = true;
        std::cout << "!!! Using INSANELY_INSECURE_SCARY_FLAG_DO_NOT_EVER_ENABLE !!!\n";
    #else
        // Transform hex strings into byte arrays
        auto cleartext_token_buffer = hex_to_string(session_cleartext_token);
        auto db_hash = hex_to_string(session.token_hash);
        auto db_salt = hex_to_string(session.token_salt);

        // Hash the cleartext token from the cookie
        // TODO @performance i think using pbkdf2 for session tokens is a bit too much, maybe just use hmac?
        unsigned char session_token_hash_out_raw[64];

        fastpbkdf2_hmac_sha512((const unsigned char*)cleartext_token_buffer.c_str(), 64,
                            (const unsigned char*)db_salt.c_str(), 64,
                            session.token_iterations,
                            session_token_hash_out_raw, 64);

        session_token_hash_out_raw[64] = '\0';

        // Compare the hash we have just created to the hash in the database
        const auto session_token_valid = strncmp(reinterpret_cast<const char*>(session_token_hash_out_raw), db_hash.c_str(), 64) == 0;
    #endif

    if(!session_token_valid) {
        PQclear(session_result);

        return CleanableResult(std::make_tuple(user, UserSession{}), Status {
            UserError::SESSION_INVALID,
            "Session is invalid." 
        });
    } else {
        const auto client_ip = req->getPeerAddr().toIp();

        // The session token is valid, lets check some other stuff now
        if(!skip_additional_checks) {
            // Check if session is expired
            if(trantor::Date::date() > session.valid_until) {
                // The session has expired. Delete it from the database
                // TODO @performance this should be async!
                const char* const delete_session_sql_params[1] = { session.session_id };
                auto delete_session_result = DB::exec_prepared("session_delete_by_id", delete_session_sql_params, 1);

                if(PQresultStatus(delete_session_result) != ExecStatusType::PGRES_TUPLES_OK) {
                    const auto error_message = PQresultErrorMessage(delete_session_result);

                    // TODO @log
                    std::cout << "ERROR! Could not delete an expired session!\n" << error_message << "\n";
                }
        
                PQclear(session_result);
                PQclear(delete_session_result);

                return CleanableResult(std::make_tuple(user, UserSession{}), Status {
                    UserError::SESSION_EXPIRED,
                    "Session has expired." 
                });
            }

            // Check if client's ip address is in the allowed range for this session
            // TODO @performance I think we can skip the step of converting the sockaddr_in into a human-readable ip address string
            const auto client_ip_allowed = is_ip_in_network(client_ip.c_str(), session.ip_range);

            if(!client_ip_allowed) {
                PQclear(session_result);

                return CleanableResult(std::make_tuple(user, UserSession{}), Status {
                    UserError::SESSION_IP_NOT_ALLOWED,
                    "Your ip address is not in the range of allowed addresses of this session." 
                });
            }
        }

        if(!readonly) {
            // Update session's current ip
            if(strncmp(client_ip.c_str(), session.current_ip, client_ip.size()) != 0) {
                // TODO @performance async! There is no reason to wait for this to finish
                const char* const session_update_sql_params[2] = { session.session_id, client_ip.c_str() };
                auto session_update_result = DB::exec_prepared("session_update_ip_by_id", session_update_sql_params, 2);

                if(PQresultStatus(session_update_result) != ExecStatusType::PGRES_COMMAND_OK) {
                    const auto error_message = PQresultErrorMessage(session_update_result);

                    // TODO @log
                    std::cout << "ERROR! Could not update session's current_ip!\n" << error_message << "\n";
                }
        
                PQclear(session_update_result);
            }
        }

        user.id = session.user_id;
        user.username = PQgetvalue(session_result, 0, PQfnumber(session_result, "user_username"));

        return CleanableResult(std::make_tuple(user, session), [session_result](){
            if(session_result) PQclear(session_result);
        });
    }
}

/**
 * @brief Destroy a user session by its id
 * 
 * @param session_id Id (uuidv4) of a session that will be destroyed
 * @param req Drogon's req object
 * @param reason Internal reason for the removal, ex. `logout`, `manual_destroy`, etc.
 * 
 * On success returns the deleted user session
 */
CleanableResult<UserSession> user_session_destroy(const char* session_id, const drogon::HttpRequestPtr& req, const char* reason) {
    // TODO @inclomplete We don't have a user log, so we do not use the reason anywhere

    const char* const sql_params[1] = { session_id };
    auto session_result = DB::exec_prepared("session_delete_by_id", sql_params, 1);

    if(!DB::is_result_ok(session_result)) {
        return CleanableResult(UserSession {}, Status {
            UserError::INTERNAL,
            "Could not delete the session." 
        });
    }

    auto deleted_session = UserSession::from_result(session_result);

    // TODO @incomplete create a user log entry

    return CleanableResult(deleted_session, DEFAULT_CLEANUP_FUNC(session_result));
}

/**
 * @brief Destroy (delete) a user session by it's session_id. Make sure that the session belongs to the provided user. If user_id's do not
 * match -> fail
 * 
 * @param session_id Target session's id
 * @param session_user_id User, the session belongs to
 * 
 * @return true success
 * @return false fail
 */
bool user_session_destroy_safe(const char* session_id, unsigned int session_user_id) {
    const char* const delete_session_sql_params[2] = { session_id, std::to_string(session_user_id).c_str() };
    auto delete_session_result = DB::exec_prepared("session_delete_by_id_and_user_id", delete_session_sql_params, 2);

    if(PQresultStatus(delete_session_result) != ExecStatusType::PGRES_TUPLES_OK) {
        const auto error_message = PQresultErrorMessage(delete_session_result);

        // TODO @log
        std::cout << "ERROR! Could not delete a session by it's id!\n" << error_message << "\n";

        PQclear(delete_session_result);
        return false;
    }

    if(PQntuples(delete_session_result) != 1) {
        // Did not delete anything (either there is no session with such id, or user ids do not match)
        PQclear(delete_session_result);
        return false;
    }

    PQclear(delete_session_result);
    return true;
}

/**
 * @brief Check if provided password matches the password of the user with provided user_id or username (username has higher priority)
 *
 * UserErrors that can be returned:
 * 
 * \li USER_NOT_FOUND;
 * \li PASSWORD_INCORRECT;
 * \li PASSWORD_HASHING_ALGORITHM_UNSUPPORTED;
 * 
 * @param username Username of the target user (either provide this or user_id) (will be used first)
 * @param user_id User id of the target user (either provide this or username) (will be used if username was not provided)
 * @param password Password that will be hashed and compared to the password of the target user
 */
CleanableResult<User> user_compare_passwords(const char* username, unsigned int user_id, const char* password) {
    // Get the user
    PGresult* user_result;
    
    // TODO @refactor
    if(username == nullptr || strnlen(username, 1) == 0) {
        // Use user_id
        const char* const sql_params[1] = { std::to_string(user_id).c_str() };
        user_result = DB::exec_prepared("user_get_by_id", sql_params, 1);
    } else {
        // Use user_username
        const char* const sql_params[1] = { username };
        user_result = DB::exec_prepared("user_get_by_username", sql_params, 1);
    }

    if(!DB::is_result_ok(user_result)) {
        // TODO @robustness !ok does not necessarily mean that the user was not found. Some other error might be the case
        return CleanableResult(User {}, Status {
            UserError::USER_NOT_FOUND,
            "User was not found." 
        });
    }

    auto user = User::from_result(user_result);

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

        hash_out_raw[PASSWORD_KEY_SIZE_BYTES] = '\0';

        // Compare the hashes
        const auto password_correct = strncmp(reinterpret_cast<char*>(hash_out_raw), db_hash.c_str(), PASSWORD_KEY_SIZE_BYTES) == 0;
        
        if(password_correct) {
            return CleanableResult(user, DEFAULT_CLEANUP_FUNC(user_result));
        } else {
            PQclear(user_result);
            
            return CleanableResult(user, Status {
                UserError::PASSWORD_INCORRECT,
                "Password is incorrect." 
            });
        }
    } else {
        // Not a supported hashing algorithm

        PQclear(user_result);

        return CleanableResult(user, Status {
            UserError::PASSWORD_HASHING_ALGORITHM_UNSUPPORTED,
            "Password hashing algorithm is (no longer) supported. Please, contact administrators." 
        });
    }
}

/**
 * @brief Create a new user
 * 
 * Username and password reqirements will be checked. Uniqueness of the username will be ensured, too
 * 
 * UserErrors that can be returned:
 * 
 * \li PASSWORD_LENGTH;
 * \li USERNAME_FORMAT;
 * \li USERNAME_TAKEN;
 * \li INTERNAL;
 * 
 * @param username Username for a new user
 * @param password Cleartext password for a new user. Will be hashed
 *
 * unsigned int represents the user id of the new user
 */
Result<unsigned int> user_create(const char* username, const char* password) {
    // Check the data
    // TODO @refactor @cleanup move the checks into the API handler
    const auto password_len = strlen(password);

    if(password_len < 8 || password_len > 2048) {
        return Result((unsigned int)0, Status { UserError::PASSWORD_LENGTH, "Invalid password format." });
    }

    std::cmatch username_m;
    if(!std::regex_match(username, username_m, std::regex("^[A-Za-z0-9_]{1,64}$"))) {
        return Result((unsigned int)0, Status { UserError::USERNAME_FORMAT, "Invalid username format." });
    }

    // TODO @cleanup @refactor @performance We do not check if the username is already taken
    // This is okay, as we will get an error from the INSERT query if the username is already taken, but in that case, we have
    // already spent some time and processing power on hashing a password that will not go anywhere
    // In other words, we figure out if the username is okay only AFTER we have hashed the password

    // Generate a salt for the password
    unsigned char salt_raw[PASSWORD_SALT_SIZE_BYTES];
    RAND_bytes(salt_raw, PASSWORD_SALT_SIZE_BYTES);

    // Hash the password
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
            return Result((unsigned int)0, Status { UserError::USERNAME_TAKEN, "Username is already taken." });
        } else {
            const auto error_message = PQresultErrorMessage(result);

            // TODO @log
            std::cout << "Could not create a user from user_create()\n" << error_message;
        
            PQclear(result);
            return Result((unsigned int)0, Status { UserError::INTERNAL, "Error creating a new user." });
        }
    }

    // Get the user id
    auto user_id = std::stoul(PQgetvalue(result, 0, 0));

    PQclear(result);
    return Result((unsigned int)user_id, Status { 0, nullptr });
}

/**
 * @brief Update user's password. Current password must be correct
 * 
 * @param user_id Target user
 * @param current_password User's current password (cleartext)
 * @param new_password New password (cleartext)
 */
bool user_update_password(unsigned int user_id, const char* current_password, const char* new_password) {
    // Check if provided password is correct
    auto password_cmp_res = user_compare_passwords(nullptr, user_id, current_password);

    if(!password_cmp_res.status.is_ok()) {
        return false;
    }

    password_cmp_res.cleanup();

    // We can change the password
    // Generate a salt for the password
    unsigned char salt_raw[PASSWORD_SALT_SIZE_BYTES];
    RAND_bytes(salt_raw, PASSWORD_SALT_SIZE_BYTES);

    // Hash the password
    unsigned char hash_out_raw[PASSWORD_KEY_SIZE_BYTES];

    fastpbkdf2_hmac_sha512((const unsigned char*)new_password, strlen(new_password),
                           salt_raw, PASSWORD_SALT_SIZE_BYTES,
                           PASSWORD_HASH_ITERATIONS,
                           hash_out_raw, PASSWORD_KEY_SIZE_BYTES);

    // Create a `password` string for the database
    // `pbkdf2;*hash*;*salt*;*iterations_count*;`

    auto hash_hex = string_to_hex(std::string(reinterpret_cast<char*>(hash_out_raw), PASSWORD_KEY_SIZE_BYTES));
    auto salt_hex = string_to_hex(std::string(reinterpret_cast<char*>(salt_raw), PASSWORD_SALT_SIZE_BYTES));

    const auto db_password_str = fmt::format("pbkdf2;{};{};{};", hash_hex, salt_hex, PASSWORD_HASH_ITERATIONS);

    const char* const sql_params[2] = { std::to_string(user_id).c_str(), db_password_str.c_str() };
    auto result = DB::exec_prepared("user_update_password", sql_params, 2);

    // Check for errors
    if(PQresultStatus(result) != PGRES_COMMAND_OK) {
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not update user's password from user_update_password()\n" << error_message;

        PQclear(result);
        return false;
    }

    PQclear(result);
    return true;
}

/**
 * @brief Create a session for a user
 * 
 * UserErrors that can be returned:
 *
 * \li INTERNAL;
 *  
 * @param user_id id of the user the new session will be created for
 * @param req Drogon's req object
 */
CleanableResult<UserSession> user_session_create(unsigned int user_id, const drogon::HttpRequestPtr& req) {
    // Generate a session token & salt
    unsigned char session_salt_raw[64];
    RAND_bytes(session_salt_raw, 64);

    unsigned char session_token_raw[64];
    RAND_bytes(session_token_raw, 64);

    // Hash the token
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

    // TODO @improvement allow admins to set a custom session duration (instead of 3 months)
    auto session_expiration_date = trantor::Date::date().after(7890000).toDbStringLocal();

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
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not create a new user session from user_session_create()\n" << error_message;

        PQclear(result);
        return CleanableResult(UserSession{}, Status {
            UserError::INTERNAL,
            "Error creating a new user session."
        });
    }

    auto session = UserSession::from_result(result);

    // Also save the cleartext token (the value that will reside in the user's y_session cookie)
    strncpy(session.token_cleartext, token_cleartext_hex.c_str(), 128);
    session.token_cleartext[128] = '\0';

    return CleanableResult(session, DEFAULT_CLEANUP_FUNC(result));
}

/**
 * @brief Get all user's sessions
 * 
 * @param user_id id of the target user
 */
CleanableResult<std::vector<UserSession>> user_get_all_sessions(unsigned int user_id) {
    const char* const sql_params[1] = { std::to_string(user_id).c_str() };
    auto sessions_result = DB::exec_prepared("sessions_get_by_user_id", sql_params, 1);

    std::vector<UserSession> user_sessions;

    if(!DB::is_result_ok(sessions_result)) {
        return CleanableResult(user_sessions, Status {
            UserError::INTERNAL,
            "Could not get user's sessions." 
        });
    }

    user_sessions = UserSession::from_result_many(sessions_result);

    return CleanableResult(user_sessions, DEFAULT_CLEANUP_FUNC(sessions_result));
}
