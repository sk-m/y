#pragma once

#include <iostream>
#include <openssl/rand.h>
#include <regex>

#include "db.hpp"
#include "util.cpp"

#include "../third_party/fastpbkdf2/fastpbkdf2.h"

// TODO @check is this ok? Should we increase/decrease these numbers?
#define PASSWORD_SALT_SIZE_BYTES 64
#define PASSWORD_KEY_SIZE_BYTES 64
#define PASSWORD_HASH_ITERATIONS 200000

namespace User {
    typedef enum: unsigned char {
        OK = 0,
        USERNAME_TAKEN = 1,
        PASSWORD_LENGTH = 2,
        USERNAME_FORMAT = 3,

        INTERNAL = 255
    } ErrorCode;

    bool is_username_taken(const char* username);

    std::tuple<unsigned int, Error> user_create(const char* username, const char* password);
}

bool User::is_username_taken(const char* username) {
    const char* const sql_params[1] = { username };
    auto result = DB::exec_prepared("user_is_username_taken", sql_params, 1);
    
    const bool is_taken = PQgetvalue(result, 0, 0)[0] != '0';

    PQclear(result);
    return is_taken;
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
    unsigned char salt_raw[PASSWORD_SALT_SIZE_BYTES] = { 0 };
    RAND_bytes(salt_raw, PASSWORD_SALT_SIZE_BYTES);

    // Hash the password
    // TODO @cleanup I think we can skip the initialization of the array
    unsigned char hash_out_raw[PASSWORD_KEY_SIZE_BYTES] = {0};

    fastpbkdf2_hmac_sha512((const unsigned char*)password, password_len,
                           salt_raw, PASSWORD_SALT_SIZE_BYTES,
                           PASSWORD_HASH_ITERATIONS,
                           hash_out_raw, PASSWORD_KEY_SIZE_BYTES);

    // Create a `password` string for the database
    // `pbkdf2;*hash*;*salt*;*iterations_count*;`

    char hash_hex[(PASSWORD_KEY_SIZE_BYTES * 2) + 1];
    char salt_hex[(PASSWORD_SALT_SIZE_BYTES * 2) + 1];

    make_hex_string(hash_out_raw, PASSWORD_KEY_SIZE_BYTES, hash_hex);
    make_hex_string(salt_raw, PASSWORD_SALT_SIZE_BYTES, salt_hex);

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
