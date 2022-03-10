#pragma once

#include <chrono>
#include <drogon/drogon.h>

#include "../db.hpp"
#include "../user.hpp"

namespace API_User {
    namespace Handler {
        // POST /user/create
        void user_create(API_HANDLER_ARGS) {
            auto body = req->getParameters();

            const auto p_username = body.find("username");
            const auto p_password = body.find("password");

            // Check if we have got all the params we need
            if(
                p_username == body.end() ||
                p_password == body.end()
            ) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = "Some or all of required parameters were not provided - `username` and `password`.";

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                api_callback(resp);
                return;
            }

            // Create a new user
            const auto new_user_results = User::user_create(p_username->second.c_str(), p_password->second.c_str());
            const auto error = std::get<1>(new_user_results);

            if(!error.is_ok()) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                api_callback(resp);
                return;
            }

            // Success
            Json::Value json;
            json["success"] = true;
            json["new_user_id"] = std::get<0>(new_user_results);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);
        }

        // POST /user/login
        void user_login(API_HANDLER_ARGS) {
            auto body = req->getParameters();

            const auto p_username = body.find("username");
            const auto p_password = body.find("password");

            // Check if we have got all the params we need
            if(
                p_username == body.end() ||
                p_password == body.end()
            ) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = "Some or all of required parameters were not provided - `username` and `password`.";

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                api_callback(resp);
                return;
            }

            // Compare the passwords
            const auto password_cmp_result = User::user_compare_passwords(p_username->second.c_str(), p_password->second.c_str());
            const auto user = std::get<0>(password_cmp_result);
            const auto user_status = std::get<1>(password_cmp_result);

            if(!user_status.is_ok()) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = user_status.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                api_callback(resp);

                return;
            }

            // Login was successfull, create a new session for this user
            const auto user_session_response = User::session_create(user.id, req);
            const auto user_session = std::get<0>(user_session_response);
            const auto user_session_status = std::get<1>(user_session_response);

            if(!user_session_status.is_ok()) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = user_session_status.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                api_callback(resp);

                PQclear(user._result);
                return;
            }

            // Create a session cookie
            auto session_cookie = drogon::Cookie();

            // TODO @incomplete admins should be able to enable Secure flag
            // > session_cookie.setSecure(true);

            session_cookie.setKey("y_session");
            session_cookie.setValue(user_session.token_cleartext);
            session_cookie.setExpiresDate(user_session.valid_until);
            session_cookie.setHttpOnly(true);
            session_cookie.setSameSite(drogon::Cookie::SameSite::kStrict);
            session_cookie.setPath("/");

            Json::Value json;
            json["success"] = true;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            resp->addCookie(session_cookie);

            api_callback(resp);

            PQclear(user._result);
            PQclear(user_session._result);
        }
    }
}
