#include <drogon/drogon.h>

int main() {
    drogon::app().registerHandler("/test",
        [](const drogon::HttpRequestPtr& req,
            std::function<void (const drogon::HttpResponsePtr &)> &&callback)
        {
            Json::Value json;
            json["result"]="ok";
            auto resp=drogon::HttpResponse::newHttpJsonResponse(json);
            callback(resp);
        },
        {drogon::Get});

    drogon::app().setLogPath("./")
        .setLogLevel(trantor::Logger::kWarn)
        .addListener("0.0.0.0", 8083)
        .setThreadNum(16)
        .run();
}