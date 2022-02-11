#include <drogon/drogon.h>
#include "third_party/libpq/libpq-fe.h"

int main() {
    auto _conn = PQsetdbLogin("127.0.0.1",
        "5432",
        NULL,
        NULL,
        "db",
        "login",
        "password");

    const auto connection_status = PQstatus(_conn);

    if(connection_status != ConnStatusType::CONNECTION_OK) {
        std::cout << "Could not connect to the database!\n" << std::endl;
        return 1;
    } else {
        std::cout << "Connected succesfully!\n" << std::endl;
    }

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