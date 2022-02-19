#pragma once

#include <iostream>

#include "db.hpp"

namespace User {
    std::tuple<unsigned int, bool> user_create(const char* username, const char* password);
}

std::tuple<unsigned int, bool> User::user_create(const char* username, const char* password) {
    const auto conn_id = DB::_prepare_connection();
    auto connection = DB::_connections[conn_id];

    const char* sql_params[2] = { username, password };
    const int sql_param_lenghts[2] = { strlen(username), strlen(password) };

    auto result = PQexecPrepared(connection, "user_create", 2, sql_params, sql_param_lenghts, NULL, 0);

    if(PQresultStatus(result) != PGRES_TUPLES_OK) {
        PQclear(result);

        // TODO @log
        std::cout << "Could not create a user from User::user_create()\n";
        return std::make_tuple(0, false);
    }

    // Get the user id
    const auto user_id = std::stoi(PQgetvalue(result, 0, 0));

    PQclear(result);
    DB::_free_connection(conn_id);

    return std::make_tuple(user_id, true);
}
