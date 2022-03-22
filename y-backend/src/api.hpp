#pragma once

#include <drogon/drogon.h>

#define API_HANDLER_ARGS const drogon::HttpRequestPtr& req, std::function<void (const drogon::HttpResponsePtr &)> &&api_callback

#include "api/api_user.hpp"

namespace API {
    void _register_core_api_handlers() {
        // User
        drogon::app().registerHandler("/user/me", &API_User::Handler::user_me, {drogon::Get});
        
        drogon::app().registerHandler("/user/create", &API_User::Handler::user_create, {drogon::Post});
        drogon::app().registerHandler("/user/login", &API_User::Handler::user_login, {drogon::Post});
    }
}
