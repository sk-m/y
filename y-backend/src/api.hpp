#pragma once

#include <drogon/drogon.h>

#define API_HANDLER_ARGS const drogon::HttpRequestPtr& req, std::function<void (const drogon::HttpResponsePtr &)> &&api_callback

#include "api/api_user.hpp"

namespace API {
    void _register_core_api_handlers() {
        // User
        drogon::app().registerHandler("/api/user/me", &API_User::Handler::user_me, {drogon::Get});
        
        drogon::app().registerHandler("/api/user/create", &API_User::Handler::user_create, {drogon::Post});
        drogon::app().registerHandler("/api/user/login", &API_User::Handler::user_login, {drogon::Post});
        drogon::app().registerHandler("/api/user/logout", &API_User::Handler::user_logout, {drogon::Post});

        drogon::app().registerHandler("/api/user/preferences", &API_User::Handler::user_preferences, {drogon::Get});
    }
}
