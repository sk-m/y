#pragma once

#include "../user.hpp"

namespace ORM_UserSession {
    User::UserSession _process_record(PGresult* db_result, int n) {
        User::UserSession session;

        const auto valid_until_raw = std::string(PQgetvalue(db_result, n, PQfnumber(db_result, "session_valid_until")));

        // TODO @refactor @performance I'm sure this can be more elegant
        session.session_id = PQgetvalue(db_result, n, PQfnumber(db_result, "session_id"));
        session.user_id = std::stoi(PQgetvalue(db_result, n, PQfnumber(db_result, "session_user_id")));
        session.current_ip = PQgetvalue(db_result, n, PQfnumber(db_result, "session_current_ip"));
        session.ip_range = PQgetvalue(db_result, n, PQfnumber(db_result, "session_ip_range"));
        session.token_hash = PQgetvalue(db_result, n, PQfnumber(db_result, "session_token_hash"));
        session.token_salt = PQgetvalue(db_result, n, PQfnumber(db_result, "session_token_salt"));
        session.token_iterations = std::stoi(PQgetvalue(db_result, n, PQfnumber(db_result, "session_token_iterations")));

        // TODO* @performance @minor This is *extremely* minor, but sometimes we call this function right after creating a new session
        // (from Postgres' INSERT INTO user_sessions ... RETURNING *). This means, that we already have a Date instance on our
        // hands, but instead of using it, we rely on this function, which will *parse* the timestamp that we have just created
        // and sent to the database.

        // So, in other words, we create a new Date, *stringify it*, insert into the database, call this function and *parse the
        // string timestamp back into Date*
        // This has a pretty much non-existent impact on the performance, but it doesn't feel good...

        session.valid_until = trantor::Date::fromDbStringLocal(valid_until_raw);
        session.device = PQgetvalue(db_result, n, PQfnumber(db_result, "session_device"));

        return session;
    }

    ORM_ONE(User::UserSession)
}
