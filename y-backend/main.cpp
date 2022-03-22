#include <drogon/drogon.h>

#include "src/db.hpp"
#include "src/api.hpp"

int main() {
    // Connect to the databse
    const bool db_status = DB::_init();

    // Could not connect to the database. We can not continue
    if(!db_status) return 1;

    // Register the API routes
    API::_register_core_api_handlers();

    // Configure and start the web server
    auto app = &drogon::app();

    app->setLogPath("./")
        .setLogLevel(trantor::Logger::kError)
        .addListener("0.0.0.0", 8083)
        .setThreadNum(16);

    // CORS
    // TODO @placeholder *
    app->registerPostHandlingAdvice(
        [](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
            resp->addHeader("Access-Control-Allow-Credentials", "true");
            resp->addHeader("Access-Control-Expose-Headers", "Set-Cookie");

            // TODO @placeholder
            resp->addHeader("Access-Control-Allow-Origin", "http://beta.local:3000");
        });

        
    app->run();
}