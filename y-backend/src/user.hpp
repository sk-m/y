#pragma once

#include <iostream>

#include "db.hpp"

namespace User {
    std::tuple<unsigned int, bool> user_create(const char* username, const char* password);
}

std::tuple<unsigned int, bool> User::user_create(const char* username, const char* password) {
    const char* const sql_params[2] = { username, password };
    auto result = DB::exec_prepared("user_create", sql_params, 2);

    if(PQresultStatus(result) != PGRES_TUPLES_OK) {
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not create a user from User::user_create()\n" << error_message;

        PQclear(result);
        return std::make_tuple(0, false);
    }

    // Get the user id
    const auto user_id = std::stoi(PQgetvalue(result, 0, 0));

    PQclear(result);
    return std::make_tuple(user_id, true);
}
