#include <drogon/drogon.h>

#include "src/db.hpp"

int main() {
    // Connect to the databse
    const bool db_status = DB::_init();

    // Could not connect to the database. We can not continue
    if(!db_status) return 1;

    drogon::app().registerHandler("/test",
        [](const drogon::HttpRequestPtr& req,
            std::function<void (const drogon::HttpResponsePtr &)> &&callback)
        {
            auto res = DB::query("SELECT * FROM pending_revisions LIMIT 10", true);

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