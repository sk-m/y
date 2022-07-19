#pragma once

#include <functional>
#include <vector>
#include <unordered_map>
#include <assert.h>

#include <libpq-fe.h>
#include <fmt/format.h>

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

#include <yaml-cpp/yaml.h>

// TODO @placeholder move into a config file
#define DB_CONNECTIONS_N 10

#define DEFAULT_CLEANUP_FUNC(result) [result](){ if(result) PQclear(result); }

namespace DB {
    // enum class QueryResultsType: unsigned char {
    //     Hashmap,
    //     JSON,
    //     Raw
    // };

    // struct Results {
    //     /**
    //      * @brief Indicates whether or not the query was successfull and the data can be accessed
    //      */
    //     bool ok = true;

    //     /**
    //      * @brief If [ok] is false - will hold the error that was returned by the database
    //      */
    //     ExecStatusType error;

    //     /**
    //      * @brief Indicates where the data is stored, in [data], [data_json] or just in the [_pgresult] object
    //      */
    //     QueryResultsType results_type = QueryResultsType::Hashmap;

    //     std::vector<std::unordered_map<const char*, const char*> > data;
    //     rapidjson::Document* data_json;

    //     /**
    //      * @brief How many rows were affected
    //      */
    //     unsigned int n_affected_rows = 0;

    //     /**
    //      * If false (default) - the results will be cleared from memory as soon as this Results object falls out of scope
    //      * If true - the results will not be cleared at all. Please don't forget to clear manually with `PQclear(_pgresult)` when you
    //      * need to
    //      */
    //     bool do_not_clear_results = false;

    //     PGresult* _pgresult = nullptr;

    //     ~Results() {
    //         if(!do_not_clear_results) {
    //             if(_pgresult) PQclear(_pgresult);

    //             // TODO @cleanup I'm pretty sure we don't need to do this. It probably happns automatically
    //             if(results_type == QueryResultsType::JSON) delete data_json;
    //         }
    //     }
    // };

    PGconn** conn_ready[DB_CONNECTIONS_N];
    PGconn** conn_busy[DB_CONNECTIONS_N];

    // /**
    //  * @brief Query the database (blocking)
    //  *
    //  * @param query_str SQL
    //  * @param results_type save data as a vector of hashmaps, json or do not do anything with the results (raw)
    //  * @return query results
    //  */
    // Results query(const char* query_str, QueryResultsType results_type = QueryResultsType::Hashmap);

    /**
     * @brief Execute a prepared statement. Do not forget to call PQclear() on the result
     *
     * @param statement_name name of the prepared statement
     * @param params parameters
     * @param params_n number of paramenters provided
     * @param result_format 0 - text, 1 - binary
     * @param param_formats see https://www.postgresql.org/docs/current/libpq-exec.html
     *
     * @return PGresult* don't forget to PQclear()!
     */
    PGresult* exec_prepared(const char* statement_name, const char* const* params, unsigned int params_n, const int* param_formats = NULL, int result_format = 0);

    PGconn* _connections[DB_CONNECTIONS_N];

    bool _init();

    // Util
    inline bool is_result_ok(PGresult* db_result, bool require_rows = true);

    // Statements
    bool _prepare_statement(PGconn* connection, const char* statement_name, const char* query, int n_params, const Oid *param_types);
    bool _prepare_core_statements(PGconn* connection);

    // Connections
    inline unsigned char _prepare_connection();
    inline void _free_connection(unsigned char conn_id);
}

/**
 * @brief Check if a database query was successful. Will automatically PQclear the db_result object if not (on return false)
 * 
 * @param db_result Result, returned by the database
 */
inline bool DB::is_result_ok(PGresult* db_result, bool require_rows) {
    const auto status = PQresultStatus(db_result);

    // No data returned from query
    if(status == ExecStatusType::PGRES_COMMAND_OK) true;

    if(status != ExecStatusType::PGRES_TUPLES_OK || PQnfields(db_result) == 0 || (require_rows && PQntuples(db_result) == 0)) {
        // Data should have been returned by query, but something went wrong
        PQclear(db_result);

        return false;
    }

    return true;
}

// DB::Results DB::query(const char* query_str, QueryResultsType results_type) {
//     // Prepare and gather a connection to the database
//     const auto conn_id = _prepare_connection();
//     auto connection = _connections[conn_id];

//     // Send a query to the database
//     auto result = PQexec(connection, query_str);

//     // Prepare the results object
//     Results query_results;

//     // Check the status of the query
//     const auto query_status = PQresultStatus(result);

//     switch(query_status) {
//         case PGRES_COMMAND_OK:
//         case PGRES_TUPLES_OK:
//             break;

//         case PGRES_NONFATAL_ERROR: {
//             query_results.error = query_status;
//         } break;

//         default: {
//             // Error
//             query_results.ok = false;
//             query_results.error = query_status;

//             return query_results;
//         }
//     }

//     // Save the result object, so we can clean it when we need to
//     query_results._pgresult = result;

//     const auto affected_rows = PQcmdTuples(result);
//     if(affected_rows) query_results.n_affected_rows += std::stoi(affected_rows);

//     // Convert the data that we have got into a vector of hashmaps
//     const auto rows_n = PQntuples(result);
//     const auto cols_n = PQnfields(result);

//     switch(results_type) {
//         case QueryResultsType::Hashmap: {
//             // Save data as a vector of hashmaps

//             query_results.data = std::vector<std::unordered_map<const char*, const char*>>(rows_n, std::unordered_map<const char*, const char*>(cols_n));

//             for(int r = 0; r < rows_n; r++) {
//                 for(int c = 0; c < cols_n; c++) {
//                     query_results.data[r].insert(std::make_pair<const char*, const char*>(PQfname(result, c), PQgetvalue(result, r, c)));
//                 }
//             }
//         } break;

//         case QueryResultsType::JSON: {
//             // Save data as json
//             // TODO @performance there are a lot of optimization that can take place here

//             auto d = new rapidjson::Document();
//             auto d_allocator = d->GetAllocator();

//             d->SetArray();

//             for(int r = 0; r < rows_n; r++) {
//                 rapidjson::Value row(rapidjson::kObjectType);

//                 for(int c = 0; c < cols_n; c++) {
//                     const auto name = PQfname(result, c);
//                     const auto value_raw = PQgetvalue(result, r, c);
//                     rapidjson::Value value;

//                     if(PQgetisnull(result, r, c)) {
//                         value.SetNull();
//                     } else {
//                         // TODO @hack @incomplete Use pg_type table
//                         switch(PQftype(result, c)) {
//                             // Boolean
//                             case 16: {
//                                 value.SetBool(value_raw[0] == 't');
//                             } break;

//                             // Number
//                             // TODO @incomplete
//                             case 20: {
//                                 value.SetInt64(std::stoll(value_raw));
//                             } break;

//                             case 21: {
//                                 value.SetInt(std::stoi(value_raw));
//                             } break;

//                             case 23:{
//                                 value.SetInt(std::stol(value_raw));
//                             } break;

//                             case 700: {
//                                 value.SetFloat(std::stof(value_raw));
//                             } break;

//                             case 701: {
//                                 value.SetDouble(std::stod(value_raw));
//                             } break;

//                             default:
//                                 value.SetString(value_raw, strlen(value_raw), d_allocator);
//                         }
//                     }

//                     row.AddMember(
//                         rapidjson::Value().SetString(name, strlen(name), d_allocator),
//                         value,
//                         d_allocator
//                     );
//                 }

//                 d->PushBack(row, d_allocator);
//             }

//             query_results.data_json = std::move(d);
//         } break;

//         case QueryResultsType::Raw:
//             break;
//     }

//     query_results.results_type = results_type;

//     // TODO we might be ok with moving a connection to the "ready" array earlier
//     _free_connection(conn_id);

//     return query_results;
// }

PGresult* DB::exec_prepared(const char* statement_name, const char* const* params, unsigned int params_n, const int* param_formats, int result_format) {
    const auto conn_id = DB::_prepare_connection();
    auto connection = DB::_connections[conn_id];

    int sql_param_lenghts[params_n];

    for(int i = 0; i < params_n; i++) {
        sql_param_lenghts[i] = strlen(params[i]);
    }

    auto result = PQexecPrepared(connection, statement_name, params_n, params, sql_param_lenghts, param_formats, result_format);

    DB::_free_connection(conn_id);
    return result;
}

bool DB::_prepare_statement(PGconn* connection, const char* statement_name, const char* query, int n_params, const Oid *param_types) {
    auto result = PQprepare(connection, statement_name, query, n_params, param_types);
    const auto status = PQresultStatus(result);

    if(status != PGRES_COMMAND_OK) {
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not prepare a statement '" << statement_name << "'\nError message: " << error_message;

        PQclear(result);
        return false;
    }

    PQclear(result);
    return true;
}

bool DB::_prepare_core_statements(PGconn* connection) {
    // TODO @cleanup move into a separate file? This function will get quite big

    // Checking if a username is taken
    if(!_prepare_statement(
        connection,
        "user_is_username_taken",
        "SELECT count(*) FROM public.users WHERE user_username = $1::varchar",
        1,
        NULL
    )) return false;

    // Creating a new user
    if(!_prepare_statement(
        connection,
        "user_create",
        "INSERT INTO public.users (user_username, user_password) VALUES ($1::varchar, $2::varchar) RETURNING user_id",
        2,
        NULL
    )) return false;

    // Creating a new user session
    if(!_prepare_statement(
        connection,
        "user_create_session",
        "INSERT INTO public.user_sessions (session_user_id, session_current_ip, session_ip_range, session_token_hash, session_token_salt, session_token_iterations, session_valid_until, session_device) VALUES ($1::integer, $2, $3, $4, $5, $6::integer, $7::timestamp, $8::varchar) RETURNING *",
        8,
        NULL
    )) return false;

    // Getting a user session by it's session_id
    if(!_prepare_statement(
        connection,
        "session_get_by_id",
        "SELECT public.user_sessions.*, public.users.user_username \
FROM public.user_sessions \
INNER JOIN public.users ON (public.user_sessions.session_user_id = public.users.user_id) \
WHERE public.user_sessions.session_id = $1",
        1,
        NULL
    )) return false;

    // Getting all sessions of a particular user
    if(!_prepare_statement(
        connection,
        "sessions_get_by_user_id",
        "SELECT * FROM public.user_sessions WHERE session_user_id = $1",
        1,
        NULL
    )) return false;

    // Deleting a user session by its session_id
    if(!_prepare_statement(
        connection,
        "session_delete_by_id",
        "DELETE FROM public.user_sessions WHERE session_id = $1 RETURNING *",
        1,
        NULL
    )) return false;

    // Deleting a user session by its session_id (w/ user_id safety check)
    if(!_prepare_statement(
        connection,
        "session_delete_by_id_and_user_id",
        "DELETE FROM public.user_sessions WHERE session_id = $1 AND session_user_id = $2 RETURNING *",
        2,
        NULL
    )) return false;

    // Updating session's current_ip
    if(!_prepare_statement(
        connection,
        "session_update_ip_by_id",
        "UPDATE public.user_sessions SET session_current_ip = $2 WHERE session_id = $1",
        2,
        NULL
    )) return false;
    
    // Updating user's password
    if(!_prepare_statement(
        connection,
        "user_update_password",
        "UPDATE public.users SET user_password = $2 WHERE user_id = $1",
        2,
        NULL
    )) return false;

    // Getting a user by it's id
    if(!_prepare_statement(
        connection,
        "user_get_by_id",
        "SELECT * FROM public.users WHERE user_id = $1::integer",
        1,
        NULL
    )) return false;

    // Getting a user by it's username
    if(!_prepare_statement(
        connection,
        "user_get_by_username",
        "SELECT * FROM public.users WHERE user_username = $1::varchar",
        1,
        NULL
    )) return false;

    // ----- User groups -----

    // Creating a new user group
    if(!_prepare_statement(
        connection,
        "usergroup_create",
        "INSERT INTO public.usergroups (group_name, group_display_name) VALUES ($1::varchar, $2::varchar) RETURNING *",
        2,
        NULL
    )) return false;

    // Getting all user groups
    if(!_prepare_statement(
        connection,
        "usergroup_get_all",
        "SELECT * FROM public.usergroups",
        0,
        NULL
    )) return false;

    // Getting a user group by it's name (definition only)
    if(!_prepare_statement(
        connection,
        "usergroup_get_by_name_definition",
        "SELECT * FROM public.usergroups WHERE group_name = $1::varchar",
        1,
        NULL
    )) return false;

    // Getting a user group by it's name (including rights)
    if(!_prepare_statement(
        connection,
        "usergroup_get_by_name_full",
        "SELECT \
public.usergroups.*, \
public.usergroup_rights.right_name, \
public.usergroup_right_options.right_option, \
public.usergroup_right_options.option_value \
FROM public.usergroups \
LEFT JOIN public.usergroup_rights ON public.usergroups.group_id = public.usergroup_rights.group_id \
LEFT JOIN public.usergroup_right_options ON public.usergroup_rights.group_right_relation_id = public.usergroup_right_options.group_right_relation_id \
WHERE public.usergroups.group_name = $1::varchar",
        1,
        NULL
    )) return false;
    
    // Updating a user group
    if(!_prepare_statement(
        connection,
        "usergroup_update",
        "UPDATE public.usergroups SET group_display_name = $2::varchar WHERE group_id = $1::integer RETURNING *",
        2,
        NULL
    )) return false;

    // Deleting a user group
    if(!_prepare_statement(
        connection,
        "usergroup_delete",
        "DELETE FROM public.usergroups WHERE group_id = $1::integer",
        1,
        NULL
    )) return false;

    return true;
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
    // Init the connection arrays
    conn_ready[DB_CONNECTIONS_N];
    conn_busy[DB_CONNECTIONS_N];
    _connections[DB_CONNECTIONS_N];

    // Read the credentials config file
    // TODO @robustness path, error messages
    YAML::Node credentials_file = YAML::LoadFile("./config/credentials.yaml");
    auto db_credentials = credentials_file["database"];

    const auto db_host = db_credentials["host"].as<std::string>();
    const auto db_port = db_credentials["port"].as<std::string>();
    const auto db_database = db_credentials["database"].as<std::string>();
    const auto db_user = db_credentials["user"].as<std::string>();
    const auto db_pass = db_credentials["pass"].as<std::string>();

    const char* const keywords[] = {"hostaddr", "port", "dbname", "user", "password", "application_name", "fallback_application_name", NULL};

    // Open the database connections
    // TODO @incomplete get the number of connections from the config file
    for(unsigned int i = 0; i < DB_CONNECTIONS_N; i++) {
        const char* const values[] = {db_host.c_str(), db_port.c_str(), db_database.c_str(), db_user.c_str(), db_pass.c_str(), fmt::format("y conn {}", i).c_str(), "y", NULL};

        // Open a connection and add it to the connections array. Also add this connection to the list of "ready" connections
        _connections[i] = PQconnectdbParams(keywords, values, 0);
        conn_ready[i] = &_connections[i];

        // Check the status of the connection
        const auto connection_status = PQstatus(_connections[i]);

        if(connection_status != ConnStatusType::CONNECTION_OK) {
            std::cout << "Could not connect to the database!\n";
            return false;
        }

        // This connection is now open, prepare the core statements for this connection
        // TODO @cleanup IIUC, we can avoid this by changing the database config a bit
        // However, we want to be robust, so I don't want to rely on the database config. Let's be safe
        if(!_prepare_core_statements(_connections[i])) {
            // TODO @Log
            std::cout << "Could not prepare a core statement on connection " << i << ", please check previous log entries for more info\n";
            return false;
        }

        // TODO @inclomplete @log use a logger instead
        std::cout << "Connection " << i << " ready!\n";
    }

    return true;
}
