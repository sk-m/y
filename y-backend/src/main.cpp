#include <drogon/drogon.h>
#include <yaml-cpp/yaml.h>

#include "db.hpp"
#include "api.hpp"

int main() {
    // Connect to the databse
    const bool db_status = DB::_init();

    // Could not connect to the database. We can not continue
    if(!db_status) return 1;

    // Get the server configuration
    // TODO @robustness path, error messages
    YAML::Node server_config_file = YAML::LoadFile("./config/server.yaml");
    auto server_config = server_config_file["server"];
    auto domain_config = server_config_file["domain"];

    const auto server_host = server_config["host"].as<std::string>();
    const auto server_port = server_config["port"].as<int>();
    const auto server_threads_n = server_config["threads_n"].as<int>();

    const auto frontend_origin = domain_config["frontend_origin"].as<std::string>();

    // TODO @log
    std::cout << "Starting server on " << server_host << ":" << server_port << " with " << server_threads_n
              << " threads. frontend_origin = " << frontend_origin << "\n";

    // Configure and start the web server
    auto app = &drogon::app();

    app->setLogPath("./")
        .setLogLevel(trantor::Logger::kError)
        .addListener(server_host.c_str(), server_port)
        .setThreadNum(server_threads_n);

    // CORS
    // TODO? not sure this is the right stage to send the cors headers
    app->registerPreSendingAdvice(
        [&frontend_origin](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
            resp->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            resp->addHeader("Access-Control-Allow-Credentials", "true");
            resp->addHeader("Access-Control-Expose-Headers", "Set-Cookie");

            resp->addHeader("Access-Control-Allow-Origin", frontend_origin.c_str());

            // TODO? unsure. Check W3C
            if(req->method() == drogon::HttpMethod::Options) {
                resp->setStatusCode(drogon::HttpStatusCode::k200OK);
            }
        });

    // Register the API routes
    API::_register_core_api_handlers(app);

    app->run();
}