#pragma once

#include <stdexcept>
#include <string>
#include <functional>
#include <unordered_map>

#include <drogon/drogon.h>

// TODO @cleanup @refactor put all this in namespace Util?
// TODO @cleanup the code in here, split into a couple of files

// TODO this is probably completely ok, but I get a feeling that I'm thinking with the JS part of my brain here
struct Status {
    unsigned char contextual_error_code = 0;
    const char* explanation_user = nullptr;

    inline bool is_ok() const { return contextual_error_code == 0; };
};

template <typename T>
struct Result {
    Status status;
    T data;

    // Constructors

    Result(T p_data, Status p_status) {
        data = p_data;
        status = p_status;
    }

    Result() = default;
};

template <typename T>
struct CleanableResult: Result<T> {
    std::function<void()> _cleanup_func = nullptr;

    inline void cleanup() {
        if(_cleanup_func) _cleanup_func();
    }

    // Constructors

    CleanableResult(T p_data, std::function<void()> p_cleanup_func) {
        this->data = p_data;
        this->status = Status { 0, nullptr };
        _cleanup_func = p_cleanup_func;
    }

    CleanableResult(T p_data, Status p_status) {
        this->data = p_data;
        this->status = p_status;
    }

    CleanableResult(T p_data, Status p_status, std::function<void()> p_cleanup_func) {
        this->data = p_data;
        this->status = p_status;
        _cleanup_func = p_cleanup_func;
    }

    CleanableResult() = default;
};

/**
 * @brief Create a pre-populated Json::Value object for a successful response
 * 
 * @param route_name Name of the route from where you are responding
 * @param results_json Your results json
 */
inline Json::Value make_success_json(const char* route_name, Json::Value results_json) {
    Json::Value json;

    json["meta"]["success"] = true;

    json[route_name] = results_json;

    return json;
}

/**
 * @brief Create a pre-populated Json::Value object for an unsuccessful response
 * 
 * Please use [send_error] if you want to send an unsuccessful response. That function uses this one under the hood
 * 
 * @param error_message Error message
 * @param is_unauthenticated @ignore! Set to true to indicate that the client is unauthenticated. I doubt you'll need to use this, as the
 * authentication is already handled by a middleware
 */
inline Json::Value make_error_json(const char* error_message, bool is_unauthenticated = false) {
    Json::Value json;

    json["meta"]["error"] = true;
    json["meta"]["error_message"] = error_message;

    if(is_unauthenticated) {
        json["meta"]["client_unauthenticated"] = true;
    }

    return json;
}

/**
 * @brief (for use in an api handler) Respond with an error (non-200 status code)
 * 
 * @param status Non-OK status
 * @param status_code HTTP status code that will be used in the response
 * @param api_callback drogon's callback function, provided by the route handler
 */
void send_error(Status status, drogon::HttpStatusCode status_code, std::function<void (const drogon::HttpResponsePtr &)> &api_callback) {
    const auto json = make_error_json(status.explanation_user);

    auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
    resp->setStatusCode(status_code);

    api_callback(resp);
};

/**
 * @brief (for use in an api handler) Respond with an error (non-200 status code)
 * 
 * @param error_message Error message
 * @param status_code HTTP status code that will be used in the response
 * @param api_callback drogon's callback function, provided by the route handler
 */
void send_error(const char* error_message, drogon::HttpStatusCode status_code, std::function<void (const drogon::HttpResponsePtr &)> &api_callback) {
    const auto json = make_error_json(error_message);

    auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
    resp->setStatusCode(status_code);

    api_callback(resp);
};

// TODO @cleanup @refactor would we even use hashmap_to_json somewhere other than UserGroupWithAssignedRights::to_json()? YAGNI?

// TODO @performance @refactor use RapidJSON?
// TODO @performance reserve somehow?
inline Json::Value hashmap_to_json(std::unordered_map<std::string, char*> map) {
    Json::Value json = Json::objectValue;

    for(auto item : map) {
        json[item.first] = item.second;
    }

    return json;
}

// TODO @performance @refactor use RapidJSON?
// TODO @performance reserve somehow?
inline Json::Value hashmap_to_json(std::unordered_map<std::string, std::unordered_map<std::string, char*>> map) {
    Json::Value json = Json::objectValue;

    for(auto item : map) {
        json[item.first] = hashmap_to_json(item.second);
    }

    return json;
}

constexpr char _hexmap[] = {'0', '1', '2', '3', '4', '5', '6', '7',
                           '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

// TODO @performance speed of these hex-related functions?
// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
std::string string_to_hex(const std::string& input) {
    static const char hex_digits[] = "0123456789abcdef";

    std::string output;
    output.reserve(input.length() * 2);
    for (unsigned char c : input)
    {
        output.push_back(hex_digits[c >> 4]);
        output.push_back(hex_digits[c & 15]);
    }
    return output;
}

// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
int _hex_value(unsigned char hex_digit) {
    static const signed char hex_values[256] = {
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
         0,  1,  2,  3,  4,  5,  6,  7,  8,  9, -1, -1, -1, -1, -1, -1,
        -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    };
    int value = hex_values[hex_digit];
    if (value == -1) throw std::invalid_argument("invalid hex digit");
    return value;
}

// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
std::string hex_to_string(const std::string& input) {
    const auto len = input.length();
    if (len & 1) throw std::invalid_argument("odd length");

    std::string output;
    output.reserve(len / 2);
    for (auto it = input.begin(); it != input.end(); )
    {
        int hi = _hex_value(*it++);
        int lo = _hex_value(*it++);
        output.push_back(hi << 4 | lo);
    }
    return output;
}

// (c) Karol Kuczmarski "Xion" (https://xion.org.pl/2012/02/04/checking-whether-ip-is-within-a-subnet/)
bool is_ip_in_network(const char *addr, const char *net) {
    struct in_addr ip_addr;
    if(!inet_aton(addr, &ip_addr)) return false;

    char network[32];
    strncpy(network, net, strlen(net));

    char *slash_pos = strstr(network, "/");
    if(!slash_pos) return false;

    int mask_len = atoi(slash_pos + 1);
    *slash_pos = '\0';

    struct in_addr net_addr;
    if(!inet_aton(network, &net_addr)) return false;

    unsigned int ip_bits = ip_addr.s_addr;
    unsigned int net_bits = net_addr.s_addr;
    unsigned int netmask = net_bits & ((1 << mask_len) - 1);

    // TODO @hack allow /32
    if(netmask == 0 && ip_bits == net_bits) return true;

    return (ip_bits & netmask) == net_bits;
}
