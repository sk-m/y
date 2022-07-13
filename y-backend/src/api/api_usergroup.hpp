#pragma once

#include <drogon/drogon.h>

#include "../db.hpp"
#include "../api.hpp"
#include "../user_group.hpp"

namespace API_UserGroup {
    // DELETE /usergroup/:group_id
    void handle_usergroup_delete(API_HANDLER_ARGS, std::string p_group_id) {
        const auto body = req->getParameters();

        int group_id = -1;

        try {
            group_id = std::stoi(p_group_id.c_str());

            if(group_id < 0) throw;
        } catch(const std::exception e) {
            return send_error(
                "Invalid group_id.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        const auto delete_status = usergroup_delete(group_id);

        if(!delete_status.is_ok()) {
            return send_error(delete_status, drogon::HttpStatusCode::k500InternalServerError, api_callback);
        }

        Json::Value data_json;
        const auto json = make_success_json("usergroup_delete", data_json);

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);
    }

    // PATCH /usergroup/:group_id
    void handle_usergroup_update(API_HANDLER_ARGS, std::string p_group_id) {
        const auto body = req->getParameters();

        const auto p_new_group_display_name = body.find("group_display_name");

        // Check if we have got all the params we need
        if(
            p_new_group_display_name == body.end()
        ) {
            return send_error(
                "Provide at least one field to update. Available fields are 'group_display_name'.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        int group_id = -1;

        try {
            group_id = std::stoi(p_group_id.c_str());

            if(group_id < 0) throw;
        } catch(const std::exception e) {
            return send_error(
                "Invalid group_id.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        const auto new_group_display_name = p_new_group_display_name->second.c_str();

        const auto updated_group_res = usergroup_update(group_id, new_group_display_name);

        if(!updated_group_res.status.is_ok()) {
            return send_error(updated_group_res.status, drogon::HttpStatusCode::k500InternalServerError, api_callback);
        }

        const auto updated_group = updated_group_res.data;

        const auto json = make_success_json("usergroup_update", updated_group.to_json());

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);
    }

    // GET /usergroup/:group_name
    void handle_usergroup_get_by_name(API_HANDLER_ARGS, std::string p_group_name) {
        const auto target_group_name = p_group_name.c_str();

        // TODO @cleanup we might want to remove this
        std::cmatch group_name_m;
        if(!std::regex_match(target_group_name, group_name_m, std::regex("^[a-z0-9_]{1,64}$"))) {
            return send_error(
                "Internal group name can only contain lowercase letters, numbers and underscores. Maximum length is 64.",
                drogon::HttpStatusCode::k412PreconditionFailed,
                api_callback
            );
        }

        auto target_group_res = usergroup_get(target_group_name);

        if(!target_group_res.status.is_ok()) {
            return send_error(target_group_res.status, drogon::HttpStatusCode::k500InternalServerError, api_callback);
        }

        const auto target_group = target_group_res.data;

        const auto json = make_success_json("usergroup_get", target_group.to_json());

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);

        target_group_res.cleanup();
    }

    // GET /usergroup
    void handle_usergroup_all(API_HANDLER_ARGS) {
        auto all_usergroups_res = usergroup_get_all();

        if(!all_usergroups_res.status.is_ok()) {
            return send_error(all_usergroups_res.status, drogon::HttpStatusCode::k500InternalServerError, api_callback);
        }

        const auto all_usergroups = all_usergroups_res.data;

        Json::Value groups_json;
        int i = 0;

        for(auto usergroup : all_usergroups) {
            groups_json[i++] = usergroup.to_json();
        }

        const auto json = make_success_json("usergroup", groups_json);

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);

        all_usergroups_res.cleanup();
    }

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

        auto json = make_success_json("usergroup_create", new_group.data.to_json());

        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);

        api_callback(resp);

        new_group.cleanup();
    }
}
