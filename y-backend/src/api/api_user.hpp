#pragma once

#include <chrono>
#include <drogon/drogon.h>

#include "../db.hpp"
#include "../user.hpp"

namespace API_User {
    namespace Handler {
        // GET /user/me
        void user_me(API_HANDLER_ARGS) {
            // Get the y_session cookie's value
            auto session_cookie = req->getCookie("y_session");
        
            // Get some user info from the session
            auto user_session_result = User::get_user_from_session(session_cookie.c_str(), req);
            const auto user = std::get<0>(user_session_result);
            const auto error = std::get<1>(user_session_result);

            Json::Value json;

            if(!error.is_ok()) {
                json["error"] = true;
                json["error_message"] = error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);

                api_callback(resp);
                return;
            }

            json["success"] = true;
            json["user_id"] = user.id;
            json["user_username"] = user.username;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);

            PQclear(user._result);
        }

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
                resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);

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

                if(error.contextual_error_code == User::ErrorCode::PASSWORD_LENGTH
                || error.contextual_error_code == User::ErrorCode::USERNAME_FORMAT
                || error.contextual_error_code == User::ErrorCode::USERNAME_TAKEN) {
                    resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);
                } else {
                    resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);
                }

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
                resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);

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

                switch(user_status.contextual_error_code) {
                    case User::ErrorCode::PASSWORD_INCORRECT: {
                        resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);
                    } break;

                    case User::ErrorCode::USER_NOT_FOUND: {
                        resp->setStatusCode(drogon::HttpStatusCode::k401Unauthorized);
                    } break;

                    default: {
                        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
                    }
                }

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
                resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);

                api_callback(resp);

                PQclear(user._result);
                return;
            }

            // Create a session cookie
            auto session_cookie = drogon::Cookie();

            // TODO @incomplete admins should be able to enable Secure flag
            // > session_cookie.setSecure(true);

            // TODO @incomplete domain
            // session_cookie.setDomain("something.local");
            
            session_cookie.setKey("y_session");
            session_cookie.setValue(fmt::format("{}:{}", user_session.session_id, user_session.token_cleartext));
            session_cookie.setExpiresDate(user_session.valid_until);
            session_cookie.setHttpOnly(true);
            session_cookie.setSameSite(drogon::Cookie::SameSite::kStrict);
            session_cookie.setPath("/");

            Json::Value json;
            json["success"] = true;

            // Add some info about the user to the response
            json["user_id"] = user.id;
            json["user_username"] = user.username;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            resp->addCookie(session_cookie);

            api_callback(resp);

            PQclear(user._result);
            PQclear(user_session._result);
        }
    }
}
