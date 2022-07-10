#pragma once

#include "../user.hpp"

namespace ORM_User {
    [[nodiscard]] User _process_record(PGresult* db_result, int n) {
        User user;

        // TODO @refactor @performance I'm sure this can be more elegant
        user.id = std::stoi(PQgetvalue(db_result, 0, PQfnumber(db_result, "user_id")));
        user.username = PQgetvalue(db_result, 0, PQfnumber(db_result, "user_username"));
        user.password = PQgetvalue(db_result, 0, PQfnumber(db_result, "user_password"));
        user.last_login = PQgetvalue(db_result, 0, PQfnumber(db_result, "user_last_login"));

        return user;
    }

    ORM_ONE(User)
}
