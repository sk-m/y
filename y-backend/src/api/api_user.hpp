#pragma once

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

            const bool passwords_match = std::get<0>(password_cmp_result);
            const auto error = std::get<1>(password_cmp_result);

            // TODO @hack @inclomplete this is not the right check, redo!
            if(!error.is_ok() || !passwords_match) {
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

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            api_callback(resp);
        }
    }
}
