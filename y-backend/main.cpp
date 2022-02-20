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

    // Start the web server
    drogon::app().setLogPath("./")
        .setLogLevel(trantor::Logger::kError)
        .addListener("0.0.0.0", 8083)
        .setThreadNum(16)
        .run();
}