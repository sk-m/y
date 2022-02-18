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
            auto res = DB::query("SELECT * FROM some_table LIMIT 10");

            Json::Value json;

            if(!res.ok) {
                json["error"] = true;

                auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
                callback(resp);

                return;
            }

            for(auto k = 0; k < res.data.size(); k++) {
                Json::Value row;

                auto it = res.data[k].begin();
                while(it != res.data[k].end()) {
                    row[it->first] = it->second;
                    it++;
                }

                json.append(row);
            }

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
            callback(resp);
        },
        {drogon::Get});

    drogon::app().setLogPath("./")
        .setLogLevel(trantor::Logger::kError)
        .addListener("0.0.0.0", 8083)
        .setThreadNum(16)
        .run();
}