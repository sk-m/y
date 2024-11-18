use serde::Serialize;

#[allow(dead_code)]
#[derive(Serialize)]
pub enum RightTag {
    #[serde(rename = "dangerous")]
    Dangerous,
    #[serde(rename = "administrative")]
    Administrative,
}

#[allow(dead_code)]
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
            rights: vec![
                Right {
                    name: "update_features",
                    options: vec![],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
                Right {
                    name: "update_config",
                    options: vec![],
                    tags: vec![RightTag::Administrative],
                    feature: None,
                },
            ],
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
                    options: vec![RightOption {
                        name: "allow_managing_vfs",
                        value_type: RightValueType::Boolean,
                        value_source: None,
                    }],
                    tags: vec![RightTag::Administrative],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_manage_access",
                    options: vec![RightOption {
                        name: "allow_managing_templates",
                        value_type: RightValueType::Boolean,
                        value_source: None,
                    }],
                    tags: vec![RightTag::Administrative],
                    feature: Some("storage"),
                },
                Right {
                    name: "storage_root_access",
                    options: vec![
                        RightOption {
                            name: "allow_any_endpoint",
                            value_type: RightValueType::Boolean,
                            value_source: None,
                        },
                        RightOption {
                            name: "accessible_endpoints",
                            value_type: RightValueType::StringArray,
                            value_source: Some("storage_endpoints"),
                        },
                    ],
                    tags: vec![RightTag::Administrative],
                    feature: Some("storage"),
                },
                Right {
                    name: "manage_storage_locations",
                    options: vec![],
                    tags: vec![RightTag::Administrative],
                    feature: Some("storage"),
                },
            ],
        },
    ]
}
