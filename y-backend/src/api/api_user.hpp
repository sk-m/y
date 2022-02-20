#pragma once

#include <drogon/drogon.h>

#include "../db.hpp"
#include "../user.hpp"

namespace API_User {
    namespace Handler {
        // POST /user/create
        void user_create(API_HANDLER_ARGS) {
            User::user_create("max", "some_pass");
        
            auto res = DB::query("SELECT * FROM users ORDER BY user_id DESC", true);

            if(!res.ok) {
                Json::Value json;
                json["error"] = true;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

                api_callback(resp);
                return;
            }

            rapidjson::StringBuffer buffer;
            rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
            res.data_json->Accept(writer);

            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
            resp->setBody(buffer.GetString());

            api_callback(resp);
        }
    }
}
