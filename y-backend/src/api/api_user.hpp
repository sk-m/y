#pragma once

#include <chrono>
#include <drogon/drogon.h>

#include "../db.hpp"
#include "../api.hpp"
#include "../user.hpp"

namespace API_User {
    // TODO @cleanup move out of this namespace 
    inline drogon::Cookie create_session_cookie(User::UserSession &user_session) {
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

        return session_cookie;
    }

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
            auto user_session_res = User::get_user_from_session(session_cookie.c_str(), req, false, true);

            if(!user_session_res.is_ok()) {
                // User's session is not valid. Nothing to do here. We will just ask the browser to remove the session cookie
                api_callback(resp);
                return;
            }

            // The provided session is valid. Extract an id from it and remove from the database
            char session_id[37];
            strncpy(session_id, session_cookie.c_str(), 36);
            session_id[36] = '\0';

            auto destroy_session_res = User::session_destroy(session_id, req, "logout");

            if(destroy_session_res.is_ok()) {
                // We have successfully removed a session from the database
                destroy_session_res.cleanup();
            }

            user_session_res.cleanup();
            api_callback(resp);
        }

        // GET /user/me
        void user_me(API_HANDLER_ARGS) {
            const auto current_user = req->getAttributes()->get<User::User>("current_user");

            Json::Value data_json;
            data_json["user_id"] = current_user.id;
            data_json["user_username"] = current_user.username;

            const auto json = make_success_json("user_me", data_json);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);
        }

        // GET /user/preferences
        void user_preferences(API_HANDLER_ARGS) {
            // TODO @incomplete auth middleware
            const auto target_username = req->getParameter("user_username");

            if(target_username.empty()) {
                return send_error(
                    "Please, provide either target's `user_username` or `user_id`.",
                    drogon::HttpStatusCode::k412PreconditionFailed,
                    api_callback
                );
            }

            const auto current_user = req->getAttributes()->get<User::User>("current_user");
            const auto current_session = req->getAttributes()->get<User::UserSession>("current_session");

            auto target_user_res = User::get_by_username(target_username.c_str());
            auto target_user = target_user_res.data;

            if(!target_user_res.is_ok()) {
                return send_error(target_user_res, drogon::HttpStatusCode::k400BadRequest, api_callback);
            }

            // You must have specific rights in order to view someone's preferences.
            // Check if client is trying to query their own preferences, or someone else's
            
            if(target_user.id != current_user.id) {
                target_user_res.cleanup();

                return send_error(
                    "You do not have permission to view someone else's preferences.",
                    drogon::HttpStatusCode::k403Forbidden,
                    api_callback
                );
            }

            // Client has permissions

            // Get target user's sessions
            auto user_sessions_res = User::get_user_sessions(current_user.id);
            auto user_sessions_vec = user_sessions_res.data;

            if(!user_sessions_res.is_ok()) {
                target_user_res.cleanup();

                return send_error(user_sessions_res, drogon::HttpStatusCode::k500InternalServerError, api_callback);
            }

            // TODO @incomplete get the actual preferences

            Json::Value user_preferences_json, sessions_json;

            int sessions_n = user_sessions_vec.size();

            int i = 0;
            bool current_session_found = false;

            for(auto session : user_sessions_vec) {
                Json::Value session_json;

                session_json["session_id"] = session.session_id;
                session_json["session_device"] = session.device;
                session_json["session_current_ip"] = session.current_ip;
                session_json["session_ip_range"] = session.ip_range;
                session_json["session_valid_until"] = session.valid_until.secondsSinceEpoch();

                if(!current_session_found && strncmp(session.session_id, current_session.session_id, 36) == 0) {
                    session_json["session_is_current"] = true;
                    current_session_found = true;
                } else {
                    session_json["session_is_current"] = false;
                }

                sessions_json[i] = session_json;

                i++;
            }

            user_preferences_json["user_sessions"] = sessions_json;

            const auto json = make_success_json("user_preferences", user_preferences_json);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);

            user_sessions_res.cleanup();
            target_user_res.cleanup();
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
                return send_error(
                    "Some or all of required parameters were not provided - `username` and `password`.",
                    drogon::HttpStatusCode::k412PreconditionFailed,
                    api_callback
                );
            }

            const auto user_username = p_username->second.c_str();

            // Create a new user
            const auto new_user_res = User::user_create(user_username, p_password->second.c_str());
            const auto user_id = new_user_res.data;

            if(!new_user_res.is_ok()) {
                const auto json = make_error_json(new_user_res.status.explanation_user);

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

                const auto error_code = new_user_res.status.contextual_error_code;
                if(error_code == User::ErrorCode::PASSWORD_LENGTH
                || error_code == User::ErrorCode::USERNAME_FORMAT
                || error_code == User::ErrorCode::USERNAME_TAKEN) {
                    resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);
                } else {
                    resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);
                }

                api_callback(resp);
                return;
            }

            // User created. Create a session for the new user
            auto user_session_res = User::session_create(user_id, req);
            auto user_session = user_session_res.data;

            if(!user_session_res.is_ok()) {
                return send_error(user_session_res, drogon::HttpStatusCode::k500InternalServerError, api_callback);
            }

            Json::Value data_json;
            data_json["user_id"] = new_user_res.data;
            data_json["user_username"] = user_username;

            const auto json = make_success_json("user_create", data_json);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            resp->addCookie(create_session_cookie(user_session));

            api_callback(resp);

            user_session_res.cleanup();
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
                return send_error(
                    "Some or all of required parameters were not provided - `username` and `password`.",
                    drogon::HttpStatusCode::k412PreconditionFailed,
                    api_callback
                );
            }

            // Compare the passwords
            auto password_cmp_res = User::user_compare_passwords(p_username->second.c_str(), p_password->second.c_str());
            auto user = password_cmp_res.data;

            if(!password_cmp_res.is_ok()) {
                const auto json = make_error_json(password_cmp_res.status.explanation_user);

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

                switch(password_cmp_res.status.contextual_error_code) {
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
            auto user_session_res = User::session_create(user.id, req);
            auto user_session = user_session_res.data;
           
            Json::Value data_json;
            data_json["user_id"] = user.id;
            data_json["user_username"] = user.username;

            const auto json = make_success_json("user_login", data_json);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            resp->addCookie(create_session_cookie(user_session));

            api_callback(resp);

            password_cmp_res.cleanup();
            user_session_res.cleanup();
        }

        // DELETE /user/session/{session_id}
        void user_destroy_session(API_HANDLER_ARGS, std::string p_session_id) {
            if(p_session_id.length() != 36) {
                return send_error("Invalid session id.", drogon::HttpStatusCode::k412PreconditionFailed, api_callback);
            }

            const auto current_user = req->getAttributes()->get<User::User>("current_user");

            auto destroy_session_ok = User::destroy_session(p_session_id.c_str(), current_user.id);

            if(!destroy_session_ok) {
                return send_error("Could not destroy the session.", drogon::HttpStatusCode::k500InternalServerError, api_callback);
            }

            Json::Value json;
            json["meta"]["success"] = true;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);
        }
    }
}
