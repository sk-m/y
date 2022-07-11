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

    static UserGroup from_result(PGresult* result, int row);
};

[[nodiscard]] UserGroup UserGroup::from_result(PGresult* result, int row = 0) {
    UserGroup group;

    // TODO @refactor @performance I'm sure this can be more elegant
    group.group_id = std::stoi(PQgetvalue(result, row, PQfnumber(result, "group_id")));
    group.group_name = PQgetvalue(result, row, PQfnumber(result, "group_name"));
    group.group_display_name = PQgetvalue(result, row, PQfnumber(result, "group_display_name"));

    return group;
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
