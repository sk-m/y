#include <drogon/drogon.h>

#include "src/db.hpp"
#include "src/user.hpp"

int main() {
    // Connect to the databse
    const bool db_status = DB::_init();

    // Could not connect to the database. We can not continue
    if(!db_status) return 1;

    drogon::app().registerHandler("/test",
        [](const drogon::HttpRequestPtr& req,
            std::function<void (const drogon::HttpResponsePtr &)> &&callback)
        {
            User::user_create("max", "some_pass");
            
            auto res = DB::query("SELECT * FROM users ORDER BY user_id DESC", true);

            if(!res.ok) {
                Json::Value json;
                json["error"] = true;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

                callback(resp);
                return;
            }

            rapidjson::StringBuffer buffer;
            rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
            res.data_json->Accept(writer);

            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
            resp->setBody(buffer.GetString());
            callback(resp);
        },
        {drogon::Get});

    drogon::app().setLogPath("./")
        .setLogLevel(trantor::Logger::kError)
        .addListener("0.0.0.0", 8083)
        .setThreadNum(16)
        .run();
}