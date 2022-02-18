#pragma once

#include <vector>
#include <unordered_map>
#include <assert.h>

#include "../third_party/libpq/libpq-fe.h"
#include "../third_party/fmt/format.h"

#include "./db_config.hpp"

namespace DB {
    struct Results {
        /**
         * @brief Indicates whether or not the query was successfull and the data can be accessed
         */
        bool ok = true;

        /**
         * @brief If [ok] is false - will hold the error that was returned by the database
         */
        ExecStatusType error;

        /**
         * @brief Data, returned by the database
         */
        std::vector<std::unordered_map<const char*, const char*> > data;

        /**
         * @brief How many rows were affected
         */
        unsigned int n_affected_rows = 0;

        /**
         * If false (default) - the results will be cleared from memory as soon as this Results object falls out of scope
         * If true - the results will not be cleared at all. Please don't forget to clear manually with `PQclear(_pgresult)` when you
         * need to
         */
        bool do_not_clear_results = false;

        PGresult* _pgresult = nullptr;

        ~Results() {
            if(_pgresult && !do_not_clear_results) PQclear(_pgresult);
        }
    };

    PGconn** conn_ready[DB_CONNECTIONS_N];
    PGconn** conn_busy[DB_CONNECTIONS_N];

    /**
     * @brief Query the database (blocking)
     * 
     * @param query_str SQL
     * @return query results
     */
    Results query(const char* query_str);

    PGconn* _connections[DB_CONNECTIONS_N];

    bool _init();

    inline unsigned char _prepare_connection();
    inline void _free_connection(unsigned char conn_id);
}

DB::Results DB::query(const char* query_str) {
    // Prepare and gather a connection to the database
    const auto conn_id = _prepare_connection();
    auto connection = _connections[conn_id];

    // Send a query to the database
    auto result = PQexec(connection, query_str);

    // Prepare the results object
    Results query_results;
    
    // Check the status of the query
    const auto query_status = PQresultStatus(result);

    switch(query_status) {
        case PGRES_COMMAND_OK:
        case PGRES_TUPLES_OK:
            break;

        case PGRES_NONFATAL_ERROR: {
            query_results.error = query_status;
        } break;

        default: {
            // Error
            query_results.ok = false;
            query_results.error = query_status;

            return query_results;
        }
    }

    // Save the result object, so we can clean it when we need to
    query_results._pgresult = result;

    const auto affected_rows = PQcmdTuples(result);
    if(affected_rows) query_results.n_affected_rows += std::stoi(affected_rows);

    // Convert the data that we have got into a vector of hashmaps
    const auto rows_n = PQntuples(result);
    const auto cols_n = PQnfields(result);

    query_results.data = std::vector<std::unordered_map<const char*, const char*>>(rows_n, std::unordered_map<const char*, const char*>(cols_n));

    for(int r = 0; r < rows_n; r++) {
        for(int c = 0; c < cols_n; c++) {
            query_results.data[r].insert(std::make_pair<const char*, const char*>(PQfname(result, c), PQgetvalue(result, r, c)));
        }
    }

    // TODO we might be ok with moving a connection to the "ready" array earlier
    _free_connection(conn_id);

    return query_results;
}

[[nodiscard]] inline unsigned char DB::_prepare_connection() {
    unsigned char conn_id = -1;

    // Find a connection that is ready
    for(unsigned char i = 0; i < DB_CONNECTIONS_N; i++) {
        if(conn_ready[i] != nullptr) {
            conn_id = i;
            break;
        }
    }

    if(conn_id == -1) {
        // TODO @incomplete
        std::cout << "ERR!\n";
        abort();
    };

    // Get a connection we can use and move it from the "ready" array to "busy"
    conn_busy[conn_id] = conn_ready[conn_id];
    conn_ready[conn_id] = nullptr;

    return conn_id;
}

inline void DB::_free_connection(unsigned char conn_id) {
    // TODO use debug assert
    assert(conn_busy[conn_id]);

    conn_ready[conn_id] = conn_busy[conn_id];
    conn_busy[conn_id] = nullptr;
}

bool DB::_init() {
    // Innit the connection arrays
    conn_ready[DB_CONNECTIONS_N] = {};
    conn_busy[DB_CONNECTIONS_N] = {};
    _connections[DB_CONNECTIONS_N] = {};

    const char* const keywords[] = {"hostaddr", "port", "dbname", "user", "password", "application_name", "fallback_application_name", NULL};

    // Open the database connections
    // TODO @incomplete get the number of connections from the config file
    for(unsigned int i = 0; i < DB_CONNECTIONS_N; i++) {
        const char* const values[] = {DB_ADDR, DB_PORT, DB_DATABASE, DB_USER, DB_PASS, fmt::format("y conn {}", i).c_str(), "y", NULL};

        // Open a connection and add it to the connections array. Also add this connection to the list of "ready" connections
        _connections[i] = PQconnectdbParams(keywords, values, 0);
        conn_ready[i] = &_connections[i];

        // Check the status of the connection
        const auto connection_status = PQstatus(_connections[i]);
    
        if(connection_status != ConnStatusType::CONNECTION_OK) {
            std::cout << "Could not connect to the database!\n";
            return false;
        } else {
            // TODO @inclomplete @log use a logger instead
            std::cout << "Connected " << i << " succesfully!\n";
        }
    }

    return true;
}
