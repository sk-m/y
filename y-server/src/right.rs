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
    value_source: Option<&'static str>,
}

#[derive(Serialize)]
pub struct Right {
    name: &'static str,
    options: Vec<RightOption>,
    tags: Vec<RightTag>,
    feature: Option<&'static str>,
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
                feature: None,
            }],
        },
        RightCategory {
            name: "instance_administration",
            rights: vec![Right {
                name: "update_features",
                options: vec![],
                tags: vec![RightTag::Administrative],
                feature: None,
            }],
        },
        RightCategory {
            name: "user_administration",
            rights: vec![
                Right {
                    name: "change_user_password",
                    options: vec![RightOption {
                        name: "user_groups_blacklist",
                        value_type: RightValueType::StringArray,
                        value_source: Some("user_groups"),
                    }],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
                Right {
                    name: "delete_user",
                    options: vec![],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
            ],
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
                            value_source: None,
                        },
                        RightOption {
                            name: "allow_deleting_user_groups",
                            value_type: RightValueType::Boolean,
                            value_source: None,
                        },
                        RightOption {
                            name: "mutable_user_rights",
                            value_type: RightValueType::StringArray,
                            value_source: Some("user_rights"),
                        },
                    ],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
                Right {
                    name: "assign_user_groups",
                    options: vec![
                        RightOption {
                            name: "allow_assigning_any_group",
                            value_type: RightValueType::Boolean,
                            value_source: None,
                        },
                        RightOption {
                            name: "assignable_user_groups",
                            value_type: RightValueType::StringArray,
                            value_source: Some("user_groups"),
                        },
                    ],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
            ],
        },
        RightCategory {
            name: "storage_feature",
            rights: vec![
                Right {
                    name: "manage_storage_endpoints",
                    options: vec![],
                    tags: vec![RightTag::Administrative],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_list",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_upload",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_move",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_rename",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_delete",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_download",
                    options: vec![],
                    tags: vec![],
                    feature: Some("storage"),
                },
            ],
        },
    ]
}
