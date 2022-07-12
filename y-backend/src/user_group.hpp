#pragma once

typedef enum: unsigned char {
    Y_E_USERGROUP_OK = 0,

    Y_E_USERGROUP_NAME_TAKEN = 1,

    Y_E_USERGROUP_INTERNAL = 255
} UserGroupError;

struct UserGroup {
    int group_id;

    char* group_name;
    char* group_display_name;

    bool group_is_system;

    static UserGroup from_result(PGresult* result, int row);
    static std::vector<UserGroup> from_result_many(PGresult* result);
};

[[nodiscard]] UserGroup UserGroup::from_result(PGresult* result, int row = 0) {
    UserGroup group;

    // TODO @refactor @performance I'm sure this can be more elegant
    group.group_id = std::stoi(PQgetvalue(result, row, PQfnumber(result, "group_id")));
    group.group_name = PQgetvalue(result, row, PQfnumber(result, "group_name"));
    group.group_display_name = PQgetvalue(result, row, PQfnumber(result, "group_display_name"));

    return group;
}

[[nodiscard]] std::vector<UserGroup> UserGroup::from_result_many(PGresult* result) {
    std::vector<UserGroup> groups;

    const auto rows_n = PQntuples(result);
    groups.reserve(rows_n);

    for(int i = 0; i < rows_n; i++) {
        groups.push_back(UserGroup::from_result(result, i));
    }

    return groups;
}

/**
 * @brief Create a new user group
 * 
 * UserGroupErrors that can be returned:
 * 
 * \li NAME_TAKEN;
 * \li INTERNAL;
 * 
 * @param group_name Internal group name, unique
 * @param group_display_name Display group name
 */
CleanableResult<UserGroup> usergroup_create(const char* group_name, const char* group_display_name) {
    const char* const sql_params[2] = { group_name, group_display_name };
    auto result = DB::exec_prepared("usergroup_create", sql_params, 2);

    if(PQresultStatus(result) != PGRES_TUPLES_OK) {
        // Check the type of the error
        const auto error_type = PQresultErrorField(result, PG_DIAG_SQLSTATE);

        // unique_violation (23505), group name is probably already taken 
        if(std::stoi(error_type) == 23505) {
            PQclear(result);

            return CleanableResult(UserGroup {}, Status { Y_E_USERGROUP_NAME_TAKEN, "A user group with such name already exists." });
        } else {
            const auto error_message = PQresultErrorMessage(result);

            // TODO @log
            std::cout << "Could not create a new user group from usergroup_create()\n" << error_message;
        
            PQclear(result);

            return CleanableResult(UserGroup {}, Status { Y_E_USERGROUP_INTERNAL, "Error creating a new user group." });
        }
    }

    auto new_group = UserGroup::from_result(result);

    return CleanableResult(new_group, DEFAULT_CLEANUP_FUNC(result));
}

// TODO @improvement in the future, we might want to provide a whole UserGroup object to this function, instead of enumerating fields as
// function parameters
/**
 * @brief Update an existing user group
 * 
 * UserGroupErrors that can be returned:
 * 
 * \li INTERNAL;
 * 
 * @param group_id Target group's id
 * @param group_display_name New display  name
 */
Status usergroup_update(int group_id, const char* group_display_name) {
    const char* const sql_params[2] = { std::to_string(group_id).c_str(), group_display_name };
    auto result = DB::exec_prepared("usergroup_update", sql_params, 2);

    if(PQresultStatus(result) != PGRES_COMMAND_OK) {
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not update an existing user group from usergroup_update()\n" << error_message;

        return Status { Y_E_USERGROUP_INTERNAL, "Could not update a user group" };
    } else {
        return Status {0, nullptr};
    }
}

/**
 * @brief Delete a user group
 * 
 * UserGroupErrors that can be returned:
 * 
 * \li INTERNAL;
 * 
 * @param group_id Target group's id
 */
Status usergroup_delete(int group_id) {
    const char* const sql_params[1] = { std::to_string(group_id).c_str() };
    auto result = DB::exec_prepared("usergroup_delete", sql_params, 1);

    if(PQresultStatus(result) != PGRES_COMMAND_OK) {
        const auto error_message = PQresultErrorMessage(result);

        // TODO @log
        std::cout << "Could not delete a user group from usergroup_delete()\n" << error_message;

        return Status { Y_E_USERGROUP_INTERNAL, "Could not delete a user group" };
    } else {
        return Status {0, nullptr};
    }
}

/**
 * @brief Get all defined user groups
 */
[[nodiscard]] CleanableResult<std::vector<UserGroup>> usergroup_get_all() {
    auto result = DB::exec_prepared("usergroup_get_all", {}, 0);

    std::vector<UserGroup> usergroups;

    if(!DB::is_result_ok(result)) {
        // TODO @log

        return CleanableResult(usergroups, Status {
            Y_E_USERGROUP_INTERNAL,
            "Could not get the user groups." 
        });
    }

    usergroups = UserGroup::from_result_many(result);

    return CleanableResult(usergroups, DEFAULT_CLEANUP_FUNC(result));
}

/**
 * @brief Get group by it's name
 * 
 * @param group_name Target group's internal name
 */
[[nodiscard]] CleanableResult<UserGroup> usergroup_get(const char* group_name) {
    const char* const sql_params[1] = { group_name };
    auto result = DB::exec_prepared("usergroup_get_by_name", sql_params, 1);

    // TODO @placeholder check if error type == NOT_FOUND
    if(!DB::is_result_ok(result)) {
        return CleanableResult(UserGroup {}, Status {
            Y_E_USERGROUP_INTERNAL,
            "Could not retrieve requested user group." 
        });
    }

    const auto usergroup = UserGroup::from_result(result);

    return CleanableResult(usergroup, DEFAULT_CLEANUP_FUNC(result));
}
