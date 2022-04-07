#pragma once

#include <chrono>
#include <drogon/drogon.h>

#include "../db.hpp"
#include "../api.hpp"
#include "../user.hpp"

namespace API_User {
    namespace Handler {
        // POST /user/logout
        void user_logout(API_HANDLER_ARGS) {
            // This route always returns 200 OK and never errors out
    
            // If client sends us a valid session - we remove it from the database and send them an expired y_session cookie
            // If client does not send us a valid session - there is nothing to remove, so we just send an expired y_session cookie
            // In both these cases the actual "log out" takes place, because we send an expired cookie

            // Get the y_session cookie's value
            auto session_cookie = req->getCookie("y_session");

            auto resp = drogon::HttpResponse::newHttpResponse();

            // To log a user out, we replace the existing `y_session` cookie with a one that has already expired.
            // The browser will just remove the cookie and the client will be "logged out"
            auto session_destruction_cookie = drogon::Cookie();

            session_destruction_cookie.setKey("y_session");
            session_destruction_cookie.setValue("");
            session_destruction_cookie.setExpiresDate(trantor::Date(0));
            session_destruction_cookie.setHttpOnly(true);
            session_destruction_cookie.setSameSite(drogon::Cookie::SameSite::kStrict);
            session_destruction_cookie.setPath("/");

            resp->addCookie(session_destruction_cookie);

            // Get the user from the session. We do this to make sure the session is actually valid
            // TODO? should we set skip_additional_checks to true in this case? Not quite sure
            auto user_session_result = User::get_user_from_session(session_cookie.c_str(), req, false, true);
            const auto user = std::get<0>(user_session_result);
            const auto get_session_error = std::get<1>(user_session_result);

            if(!get_session_error.is_ok()) {
                // User's session is not valid. Nothing to do here. We will just ask the browser to remove the session cookie
                api_callback(resp);
                return;
            }

            // The provided session is valid. Extract an id from it and remove from the database
            char session_id[37];
            strncpy(session_id, session_cookie.c_str(), 36);
            session_id[36] = '\0';

            const auto destroy_session_status = User::session_destroy(session_id, req, "logout");
            const auto destroyed_session = std::get<0>(destroy_session_status);
            const auto destroy_session_error = std::get<1>(destroy_session_status);

            if(destroy_session_error.is_ok()) {
                // We have successfully removed a session from the database
                RESULTS_CLEANUP(destroy_session_status);
            }

            RESULTS_CLEANUP(user_session_result);

            api_callback(resp);
        }

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
                // TODO? Send an expired y_session cookie on error?

                json["error"] = true;
                json["error_message"] = error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);

                api_callback(resp);
                return;
            }

            json["success"] = true;
            json["current_user"]["user_id"] = user.id;
            json["current_user"]["user_username"] = user.username;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);

            RESULTS_CLEANUP(user_session_result);
        }

        // GET /user/preferences
        void user_preferences(API_HANDLER_ARGS) {
            // TODO @incomplete auth middleware
            const auto target_username = req->getParameter("user_username");

            Json::Value json;

            if(target_username.empty()) {
                json["error"] = true;
                json["error_message"] = "Please, provide either target's `user_username` or `user_id`.";

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);

                api_callback(resp);
                return;
            }

            // Get the y_session cookie's value
            auto session_cookie = req->getCookie("y_session");
        
            // Get the current user
            auto user_session_result = User::get_user_from_session(session_cookie.c_str(), req);
            const auto current_user = std::get<0>(user_session_result);
            const auto current_user_error = std::get<1>(user_session_result);

            if(!current_user_error.is_ok()) {
                // TODO? Send an expired y_session cookie on error?

                json["error"] = true;
                json["error_message"] = current_user_error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);

                api_callback(resp);
                return;
            }

            auto target_user_result = User::get_by_username(target_username.c_str());
            const auto target_user = std::get<0>(target_user_result);
            const auto target_user_error = std::get<1>(target_user_result);

            if(!target_user_error.is_ok()) {
                RESULTS_CLEANUP(user_session_result);

                json["error"] = true;
                json["error_message"] = target_user_error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);

                api_callback(resp);
                return;
            }

            // You must have specific rights in order to view someone's preferences.
            // Check if client is trying to query their own preferences, or someone else's
            
            if(target_user.id != current_user.id) {
                RESULTS_CLEANUP(user_session_result);
                RESULTS_CLEANUP(target_user_result);

                json["error"] = true;
                json["error_message"] = "You do not have permission to view someone else's preferences.";

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);

                api_callback(resp);
                return;
            }

            // Client has permissions

            // Get target user's sessions
            auto user_sessions_result = User::get_user_sessions(current_user.id);
            const auto user_sessions = std::get<0>(user_sessions_result);
            const auto user_sessions_error = std::get<1>(user_sessions_result);

            if(!user_sessions_error.is_ok()) {
                RESULTS_CLEANUP(user_session_result);
                RESULTS_CLEANUP(target_user_result);

                // TODO @DRY
                json["error"] = true;
                json["error_message"] = user_sessions_error.explanation_user;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);

                api_callback(resp);
                return;
            }

            // TODO @incomplete get the actual preferences

            json["success"] = true;
            Json::Value sessions_json;

            int sessions_n = user_sessions.size();

            int i = 0;
            for(auto session : user_sessions) {
                Json::Value session_json;

                session_json["session_id"] = session.session_id;
                session_json["device"] = session.device;
                session_json["current_ip"] = session.current_ip;
                session_json["ip_range"] = session.ip_range;
                session_json["valid_until"] = session.valid_until.secondsSinceEpoch();

                sessions_json[i] = session_json;

                i++;
            }

            json["user_sessions"] = sessions_json;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);

            RESULTS_CLEANUP(user_sessions_result);
            RESULTS_CLEANUP(target_user_result);
            RESULTS_CLEANUP(user_session_result);
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

            const auto user_username = p_username->second.c_str();

            // Create a new user
            const auto new_user_results = User::user_create(user_username, p_password->second.c_str());
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
            json["new_user"]["user_id"] = std::get<0>(new_user_results);
            json["new_user"]["user_username"] = user_username;

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
            json["current_user"]["user_id"] = user.id;
            json["current_user"]["user_username"] = user.username;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            resp->addCookie(session_cookie);

            api_callback(resp);

            RESULTS_CLEANUP(password_cmp_result);
            RESULTS_CLEANUP(user_session_response);
        }
    }
}
