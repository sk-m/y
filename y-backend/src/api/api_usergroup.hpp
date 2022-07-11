#pragma once

#include <drogon/drogon.h>

#include "../db.hpp"
#include "../api.hpp"
#include "../user_group.hpp"

namespace API_UserGroup {
    // POST /usergroup/create
    void handle_usergroup_create(API_HANDLER_ARGS) {
        auto body = req->getParameters();

        const auto p_group_name = body.find("group_name");
        const auto p_group_display_name = body.find("group_display_name");

        // Check if we have got all the params we need
        if(
            p_group_name == body.end() ||
            p_group_display_name == body.end()
        ) {
            return send_error(
                "Some or all of required parameters were not provided - `group_name` and `group_display_name`.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        const auto group_name = p_group_name->second.c_str();
        const auto group_display_name = p_group_display_name->second.c_str();

        std::cmatch group_name_m;
        if(!std::regex_match(group_name, group_name_m, std::regex("^[a-z0-9_]{1,64}$"))) {
            return send_error(
                "Internal group name can only contain lowercase letters, numbers and underscores. Maximum length is 64.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        auto new_group = usergroup_create(group_name, group_display_name);

        if(!new_group.status.is_ok()) {
            const auto json = make_error_json(new_group.status.explanation_user);

            auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

            const auto error_code = new_group.status.contextual_error_code;

            if(error_code == Y_E_USERGROUP_NAME_TAKEN) {
                resp->setStatusCode(drogon::HttpStatusCode::k412PreconditionFailed);
            } else {
                resp->setStatusCode(drogon::HttpStatusCode::k403Forbidden);
            }

            api_callback(resp);
            return;
        }

        Json::Value data_json;
        data_json["group_id"] = new_group.data.group_id;
        data_json["group_name"] = new_group.data.group_name;
        data_json["group_display_name"] = new_group.data.group_display_name;

        const auto json = make_success_json("usergroup_create", data_json);

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);

        new_group.cleanup();
    }
}
