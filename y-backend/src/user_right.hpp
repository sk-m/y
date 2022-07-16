#pragma once

#include <unordered_map>
#include <vector>

#include <drogon/drogon.h>

struct UserRightOptionSelectValue {
    const char* value_label;

    const char* value;
};

struct UserRightOption {
    const char* option_name;
    const char* option_display_name;
    const char* option_description;

    const char* option_value_type;

    const std::unordered_map<const char*, UserRightOptionSelectValue> option_select_values;
};

struct UserRightCategory {
    const char* category_name;
    const char* category_display_name;
    const char* category_description;
};

struct UserRight {
    const char* right_name;
    const char* right_display_name;
    const char* right_description;
    const UserRightCategory* right_category;

    const bool right_is_dangerous = false;

    const std::unordered_map<const char*, UserRightOption> right_options;
};

#include "../persistent_data/user_rights.hpp"

[[nodiscard]] Json::Value userright_get_all_json() {
    // TODO @performance @refactor use RapidJSON here!
    // TODO @cleanup create to_json functions for UserRight, UserRightOption, UserRightCategory

    Json::Value data_json;

    Json::Value categories_json;
    Json::Value rights_json;

    categories_json.resize(PersistentData::user_right_categories.size());
    rights_json.resize(PersistentData::user_rights.size());

    // Categories
    int cat_i = 0;
    for(const auto category : PersistentData::user_right_categories) {
        const auto cat = category.second;

        Json::Value cat_json;
        
        cat_json["category_name"] = cat.category_name;
        cat_json["category_display_name"] = cat.category_display_name;
        cat_json["category_description"] = cat.category_description;

        categories_json[cat_i++] = cat_json;
    }

    // Rights
    int right_i = 0;
    for(const auto right_record : PersistentData::user_rights) {
        const auto right = right_record.second;

        Json::Value right_json;
        Json::Value right_options_json;
        
        right_json["right_name"] = right.right_name;
        right_json["right_display_name"] = right.right_display_name;
        right_json["right_description"] = right.right_description;

        right_json["right_category"] = right.right_category->category_name;

        right_json["right_is_dangerous"] = right.right_is_dangerous;

        // Right options
        int right_option_i = 0;
        right_options_json.resize(right.right_options.size());

        for(const auto right_option_record : right.right_options) {
            const auto option = right_option_record.second;

            Json::Value right_option_json;
            Json::Value right_option_select_values_json;

            right_option_json["option_name"] = option.option_name;
            right_option_json["option_display_name"] = option.option_display_name;
            right_option_json["option_description"] = option.option_description;
            right_option_json["option_value_type"] = option.option_value_type;

            // Select values
            int right_option_select_values_i = 0;
            right_option_select_values_json.resize(option.option_select_values.size());

            for(const auto right_option_select_value_record : option.option_select_values) {
                const auto select_value = right_option_select_value_record.second;

                Json::Value select_value_json;

                select_value_json["value"] = select_value.value;
                select_value_json["value_label"] = select_value.value_label;

                right_option_select_values_json[right_option_select_values_i++] = select_value_json;
            }

            right_option_json["option_select_values"] = right_option_select_values_json;

            right_options_json[right_option_i++] = right_option_json;
        }

        right_json["right_options"] = right_options_json;

        rights_json[right_i++] = right_json;
    }

    data_json["user_right_categories"] = categories_json;
    data_json["user_rights"] = rights_json;

    return data_json;
}
