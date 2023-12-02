use serde::Serialize;

#[derive(Serialize)]
pub enum RightTag {
    #[serde(rename = "dangerous")]
    Dangerous,
    #[serde(rename = "administrative")]
    Administrative,
}

#[derive(Serialize)]
pub enum RightValueType {
    #[serde(rename = "boolean")]
    Boolean,
    #[serde(rename = "number")]
    Number,
    #[serde(rename = "string")]
    String,
    #[serde(rename = "string_array")]
    StringArray,
}

#[derive(Serialize)]
pub struct RightOption {
    name: &'static str,
    value_type: RightValueType,
}

#[derive(Serialize)]
pub struct Right {
    name: &'static str,
    options: Vec<RightOption>,
    tags: Vec<RightTag>,
}

#[derive(Serialize)]
pub struct RightCategory {
    name: &'static str,
    rights: Vec<Right>,
}

pub fn get_right_categories() -> Vec<RightCategory> {
    vec![
        RightCategory {
            name: "basic",
            rights: vec![Right {
                name: "create_account",
                options: vec![],
                tags: vec![],
            }],
        },
        RightCategory {
            name: "user_administration",
            rights: vec![Right {
                name: "change_user_password",
                options: vec![RightOption {
                    name: "user_groups_blacklist",
                    value_type: RightValueType::StringArray,
                }],
                tags: vec![RightTag::Administrative],
            }],
        },
        RightCategory {
            name: "user_rights",
            rights: vec![
                Right {
                    name: "manage_user_groups",
                    options: vec![
                        RightOption {
                            name: "allow_creating_user_groups",
                            value_type: RightValueType::Boolean,
                        },
                        RightOption {
                            name: "allow_deleting_user_groups",
                            value_type: RightValueType::Boolean,
                        },
                        RightOption {
                            name: "mutable_user_rights",
                            value_type: RightValueType::StringArray,
                        },
                    ],
                    tags: vec![RightTag::Administrative],
                },
                Right {
                    name: "assign_user_groups",
                    options: vec![
                        RightOption {
                            name: "allow_assigning_any_group",
                            value_type: RightValueType::Boolean,
                        },
                        RightOption {
                            name: "assignable_user_groups",
                            value_type: RightValueType::StringArray,
                        },
                    ],
                    tags: vec![RightTag::Administrative],
                },
            ],
        },
    ]
}
