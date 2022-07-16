#pragma once

#include <unordered_map>

#include "../user_right.hpp"

namespace PersistentData {
    namespace RightCategory {
        const auto userpreferences = UserRightCategory {
            "userpreferences",
            "User Preferences",
            "Rights, related to user's own preferences. Most actions are executed through the preferences page."
        };
    }
    
    const std::unordered_map<const char*, UserRightCategory> user_right_categories = {
        {
            "userpreferences",
            RightCategory::userpreferences
        },
    };

    const std::unordered_map<const char*, UserRight> user_rights = {
        {
            "changeownpassword",
            UserRight {
                "changeownpassword",

                "Change own password",
                "Allow changing own password.",

                &RightCategory::userpreferences,

                false,

                {}
            }
        },
    };
}
