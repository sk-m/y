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

            if(!std::get<1>(new_user_results)) {
                Json::Value json;
                json["error"] = true;
                json["error_message"] = "Could not create a new user.";

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
    }
}
