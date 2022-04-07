#pragma once

#include <iostream>
#include <openssl/rand.h>
#include <regex>
#include <drogon/drogon.h>
#include <functional>

#include "../third_party/fastpbkdf2/fastpbkdf2.h"

#include "db.hpp"
#include "util.cpp"

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

        SESSION_INVALID = 20,
        SESSION_IP_NOT_ALLOWED = 21,
        SESSION_EXPIRED = 22,

        INTERNAL = 255
    } ErrorCode;

    struct User {
        unsigned int id;

        char* username;
        char* password;
        char* last_login;
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
    };

    bool is_username_taken(const char* username);
    CleanableResult<User> get_by_username(const char* username);
    CleanableResult<User> user_compare_passwords(const char* username, const char* password);
    CleanableResult<User> get_user_from_session(const char* session_cookie_value, const drogon::HttpRequestPtr& req, bool skip_additional_checks, bool readonly);
    CleanableResult<std::vector<UserSession>> get_user_sessions(unsigned int user_id);

    Result<unsigned int> user_create(const char* username, const char* password);
    CleanableResult<UserSession> session_create(unsigned int user_id, const drogon::HttpRequestPtr& req);
    CleanableResult<UserSession> session_destroy(const char* session_id, const drogon::HttpRequestPtr& req,  const char* reason);
}

// TODO @refactor @cleanup this is just not right...
#include "orm/user_session.hpp"
#include "orm/user.hpp"

bool User::is_username_taken(const char* username) {
    const char* const sql_params[1] = { username };
    auto result = DB::exec_prepared("user_is_username_taken", sql_params, 1);
    
    const bool is_taken = PQgetvalue(result, 0, 0)[0] != '0';

    PQclear(result);
    return is_taken;
}

/**
 * @brief Get the user by their username
 * 
 * ErrorCodes that can be returned:
 * \li USER_NOT_FOUND;
 * 
 * @param username target user's username
 */
CleanableResult<User::User> User::get_by_username(const char* username) {
    const char* const sql_params[1] = { username };
    auto user_result = DB::exec_prepared("user_get_by_username", sql_params, 1);

    auto user_record = ORM_User::one(user_result);
    auto user = user_record.item;

    if(!user_record.ok) {
        return CleanableResult(user, Status {
            ErrorCode::USER_NOT_FOUND,
            "Could not find the user." 
        });
    }

    return CleanableResult(user, DEFAULT_CLEANUP_FUNC(user_record));
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
 * ErrorCodes that can be returned:
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
CleanableResult<User::User> User::get_user_from_session(const char* session_cookie_value, const drogon::HttpRequestPtr& req, bool skip_additional_checks = false, bool readonly = false) {
    User user{};
    
    // Make sure we have a cookie value and not just an empty string
    if(strnlen(session_cookie_value, 256) < 128) {
        return CleanableResult(user, Status {
            ErrorCode::SESSION_INVALID,
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
        return CleanableResult(user, Status {
            ErrorCode::SESSION_INVALID,
            "Session is invalid." 
        });
    }

    const auto session_id = session_cookie_parts[0];
    const auto session_cleartext_token = session_cookie_parts[1];

    // The token should be exactly 128 bytes long (64 byte-long token in a hex format)
    if(session_cleartext_token.size() != 128) {
        return CleanableResult(user, Status {
            ErrorCode::SESSION_INVALID,
            "Session token is invalid." 
        });
    }

    // Find the session by its session_id
    const char* const sql_params[1] = { session_id.c_str() };
    auto session_result = DB::exec_prepared("session_get_by_id", sql_params, 1);

    auto session_record = ORM_UserSession::one(session_result);

    // Did we find a session with such session_id?
    if(!session_record.ok) {
        return CleanableResult(user, Status {
            ErrorCode::SESSION_INVALID,
            "Session is invalid." 
        });
    }

    auto session = session_record.item;

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

    if(!session_token_valid) {
        PQclear(session_record._result);

        return CleanableResult(user, Status {
            ErrorCode::SESSION_INVALID,
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
        
                PQclear(session_record._result);
                PQclear(delete_session_result);

                return CleanableResult(user, Status {
                    ErrorCode::SESSION_EXPIRED,
                    "Session has expired." 
                });
            }

            // Check if client's ip address is in the allowed range for this session
            // TODO @performance I think we can skip the step of converting the sockaddr_in into a human-readable ip address string
            const auto client_ip_allowed = is_ip_in_network(client_ip.c_str(), session.ip_range);

            if(!client_ip_allowed) {
                PQclear(session_record._result);

                return CleanableResult(user, Status {
                    ErrorCode::SESSION_IP_NOT_ALLOWED,
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
        user.username = PQgetvalue(session_record._result, 0, PQfnumber(session_record._result, "user_username"));

        return CleanableResult(user, [session_record](){
            if(session_record._result) PQclear(session_record._result);
        });
    }
}

/**
 * @brief Check if provided password matches the password of the user with provided user_id
 *
 * ErrorCodes that can be returned:
 * 
 * \li USER_NOT_FOUND;
 * \li PASSWORD_INCORRECT;
 * \li PASSWORD_HASHING_ALGORITHM_UNSUPPORTED;
 * 
 * @param username Username of the target user
 * @param password Password that will be hashed and compared to the password of the target user
 */
CleanableResult<User::User> User::user_compare_passwords(const char* username, const char* password) {
    // Get the user
    const char* const sql_params[1] = { username };
    auto user_result = DB::exec_prepared("user_get_by_username", sql_params, 1);

    auto user_record = ORM_User::one(user_result);
    auto user = user_record.item;

    if(!user_record.ok) {
        // TODO @robustness !ok does not necessarily mean that the user was not found. Some other error might be the case
        return CleanableResult(user, Status {
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
            return CleanableResult(user, DEFAULT_CLEANUP_FUNC(user_record));
        } else {
            PQclear(user_record._result);
            
            return CleanableResult(user, Status {
                ErrorCode::PASSWORD_INCORRECT,
                "Password is incorrect." 
            });
        }
    }

    PQclear(user_record._result);

    return CleanableResult(user, Status {
        ErrorCode::PASSWORD_HASHING_ALGORITHM_UNSUPPORTED,
        "Password hashing algorithm is (no longer) supported. Please, contact administrators." 
    });
}

/**
 * @brief Create a new user
 * 
 * Username and password reqirements will be checked. Uniqueness of the username will be ensured, too
 * 
 * ErrorCodes that can be returned:
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
Result<unsigned int> User::user_create(const char* username, const char* password) {
    // Check the data
    const auto password_len = strlen(password);

    if(password_len < 8 || password_len > 2048) {
        return Result((unsigned int)0, Status { ErrorCode::PASSWORD_LENGTH, "Invalid password format." });
    }

    std::cmatch username_m;
    if(!std::regex_match(username, username_m, std::regex("^[A-Za-z0-9_]{1,64}$"))) {
        return Result((unsigned int)0, Status { ErrorCode::USERNAME_FORMAT, "Invalid username format." });
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
            return Result((unsigned int)0, Status { ErrorCode::USERNAME_TAKEN, "Username is already taken." });
        } else {
            const auto error_message = PQresultErrorMessage(result);

            // TODO @log
            std::cout << "Could not create a user from User::user_create()\n" << error_message;
        }

        PQclear(result);
        return Result((unsigned int)0, Status { ErrorCode::INTERNAL, "Error creating a new user." });
    }

    // Get the user id
    auto user_id = std::stoul(PQgetvalue(result, 0, 0));

    PQclear(result);
    return Result((unsigned int)user_id, Status { 0, nullptr });
}

/**
 * @brief Create a session for a user
 * 
 * ErrorCodes that can be returned:
 *
 * \li INTERNAL;
 *  
 * @param user_id id of the user the new session will be created for
 * @param req Drogon's req object
 */
CleanableResult<User::UserSession> User::session_create(unsigned int user_id, const drogon::HttpRequestPtr& req) {
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
        const auto error_type = PQresultErrorField(result, PG_DIAG_SQLSTATE);
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not create a new user session from User::session_create()\n" << error_message;

        PQclear(result);
        return CleanableResult(UserSession{}, Status {
            ErrorCode::INTERNAL,
            "Error creating a new user session."
        });
    }

    auto session_record = ORM_UserSession::one(result);
    auto session = session_record.item;
    // No need to check `ok` here, as we have checked for errors manually already
        
    // Also save the cleartext token (the value that will reside in the user's y_session cookie)
    strncpy(session.token_cleartext, token_cleartext_hex.c_str(), 128);
    session.token_cleartext[128] = '\0';

    return CleanableResult(session, DEFAULT_CLEANUP_FUNC(session_record));
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
CleanableResult<User::UserSession> User::session_destroy(const char* session_id, const drogon::HttpRequestPtr& req, const char* reason) {
    // TODO @inclomplete We don't have a user log, so we do not use the reason anywhere

    const char* const sql_params[1] = { session_id };
    auto session_result = DB::exec_prepared("session_delete_by_id", sql_params, 1);

    auto deleted_session_record = ORM_UserSession::one(session_result);
    auto deleted_session = deleted_session_record.item;

    if(!deleted_session_record.ok) {
        return CleanableResult(deleted_session, Status {
            ErrorCode::INTERNAL,
            "Could not delete the session." 
        });
    }

    // TODO @incomplete create a user log entry

    return CleanableResult(deleted_session, DEFAULT_CLEANUP_FUNC(deleted_session_record));
}

/**
 * @brief Get all user's sessions
 * 
 * @param user_id id of the target user
 */
CleanableResult<std::vector<User::UserSession>> User::get_user_sessions(unsigned int user_id) {
    const char* const sql_params[1] = { std::to_string(user_id).c_str() };
    auto sessions_result = DB::exec_prepared("sessions_get_by_user_id", sql_params, 1);
    auto sessions_recods = ORM_UserSession::many(sessions_result);

    if(!sessions_recods.ok) {
        return CleanableResult(sessions_recods.items, Status {
            ErrorCode::INTERNAL,
            "Could not get user's sessions." 
        });
    }

    return CleanableResult(sessions_recods.items, DEFAULT_CLEANUP_FUNC(sessions_recods));
}
