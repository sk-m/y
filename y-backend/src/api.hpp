#pragma once

#define API_HANDLER_ARGS const drogon::HttpRequestPtr& req, std::function<void (const drogon::HttpResponsePtr &)> &&api_callback

#include <drogon/drogon.h>

#include "api/api_user.hpp"

/**
 * @brief User authentication filter middleware
 */
class AuthFilter:public drogon::HttpFilter<AuthFilter> {
    public:
        virtual void doFilter(const drogon::HttpRequestPtr &req, drogon::FilterCallback &&fcb, drogon::FilterChainCallback &&fccb) override;
};

void AuthFilter::doFilter(const drogon::HttpRequestPtr &req, drogon::FilterCallback &&fcb, drogon::FilterChainCallback &&fccb) {
    auto session_cookie = req->getCookie("y_session");

    if(session_cookie.length() < 128) {
        Json::Value json;
        json["error"] = true;
        json["error_message"] = "You are not authenticated.";

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
        resp->setStatusCode(drogon::HttpStatusCode::k401Unauthorized);

        fcb(resp);
        return;
    }

    auto user_session_res = User::get_user_from_session(session_cookie.c_str(), req);

    if(!user_session_res.is_ok()) {
        // TODO? Send an expired y_session cookie on error?
        send_error(user_session_res, drogon::HttpStatusCode::k403Forbidden, fcb);
        return;
    }

    // All ok
    // TODO @refactor @cleanup @performance
    const auto current_user = std::get<0>(user_session_res.data);
    const auto current_session = std::get<1>(user_session_res.data);

    req->getAttributes()->insert("current_user", current_user);
    req->getAttributes()->insert("current_session", current_session);

    fccb();

    user_session_res.cleanup();
}

namespace API {
    void _register_core_api_handlers(drogon::HttpAppFramework* app) {
        // User
        app->registerHandler("/api/user/me", &API_User::Handler::user_me, {drogon::Get, "AuthFilter"});
        
        app->registerHandler("/api/user/create", &API_User::Handler::user_create, {drogon::Post});
        app->registerHandler("/api/user/login", &API_User::Handler::user_login, {drogon::Post});
        app->registerHandler("/api/user/logout", &API_User::Handler::user_logout, {drogon::Post});

        app->registerHandler("/api/user/preferences", &API_User::Handler::user_preferences, {drogon::Get, "AuthFilter"});

        app->registerHandler("/api/user/session/{1:session_id}", &API_User::Handler::user_destroy_session, {drogon::Delete, "AuthFilter"});
    }
}
