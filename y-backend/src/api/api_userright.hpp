#pragma once

#include <drogon/drogon.h>

#include "../db.hpp"
#include "../api.hpp"
#include "../user_right.hpp"

namespace API_UserRight {
    // GET /userright
    void handle_userright_get_all(API_HANDLER_ARGS) {
        const auto data_json = userright_get_all_json();

        const auto json = make_success_json("userright", data_json);

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);
    }
}
