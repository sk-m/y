use std::collections::{HashMap, HashSet};

use log::error;
use serde::Serialize;
use sqlx::FromRow;

use crate::{
    storage_endpoint::get_storage_endpoint,
    user::{get_group_rights, UserRight},
    util::RequestPool,
};

#[derive(PartialEq, Debug, Serialize)]
pub enum StorageAccessType {
    Allow,
    Deny,
    Unset,
}

impl StorageAccessType {
    fn from_str(s: &str) -> Self {
        match s {
            "allow" => StorageAccessType::Allow,
            "deny" => StorageAccessType::Deny,
            _ => StorageAccessType::Unset,
        }
    }
}

pub enum StorageAccessCheckResult {
    Explicit(bool),
    Inherited(HashMap<i32, StorageAccessType>),
}

// TODO ew @cleanup
pub fn check_endpoint_root_access(endpoint_id: i32, group_rights: Vec<UserRight>) -> bool {
    for right in group_rights {
        if right.right_name.eq("storage_root_access") {
            if let Some(allow_all_endpoints) = right.right_options.get("allow_any_endpoint") {
                if allow_all_endpoints.is_boolean()
                    && allow_all_endpoints.as_bool().unwrap() == true
                {
                    return true;
                }
            }

            if let Some(allowed_endpoints) = right.right_options.get("accessible_endpoints") {
                if allowed_endpoints.is_array() {
                    for allowed_endpoint in allowed_endpoints.as_array().unwrap() {
                        if allowed_endpoint.is_i64() {
                            if allowed_endpoint.as_i64().unwrap() == endpoint_id as i64 {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }

    false
}

async fn get_storage_entry_access_rule_cascade_up(
    endpoint_id: i32,
    entry_id: i64,

    action: &str,

    user_id: i32,
    user_groups: &Vec<i32>,

    pool: &RequestPool,
) -> Result<StorageAccessCheckResult, sqlx::Error> {
    #[derive(FromRow, Serialize, Debug)]
    pub struct StorageAccessRuleRow {
        tree_step: i64,
        access_type: String,
        executor_type: String,
        executor_id: i32,
        entry_id: i64,
        action: String,
    }

    let tree_rules = sqlx::query_as::<_, StorageAccessRuleRow>("
        SELECT tree.tree_step, storage_access.entry_id, storage_access.access_type::TEXT, storage_access.action::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM (SELECT row_number() OVER () AS tree_step, id AS entry_id FROM storage_get_folder_path($1, $2)) AS tree
        JOIN storage_access ON storage_access.entry_id = tree.entry_id
        WHERE storage_access.endpoint_id = $1 AND
        storage_access.action = $3::storage_access_action_type AND
        (
            (storage_access.executor_type = 'user_group'::storage_access_executor_type AND storage_access.executor_id = ANY($4))
        OR
            (storage_access.executor_type = 'user'::storage_access_executor_type AND storage_access.executor_id = $5)
        )
        ORDER BY tree_step ASC
    ")
        .bind(&endpoint_id)
        .bind(&entry_id)
        .bind(action)
        .bind(user_groups)
        .bind(user_id)
        .fetch_all(pool)
        .await;

    let mut group_rules: HashMap<i32, StorageAccessType> = HashMap::new();
    let mut user_rule: StorageAccessType = StorageAccessType::Unset;

    if let Ok(tree_rules) = tree_rules {
        for rule in &tree_rules {
            let access_type = StorageAccessType::from_str(&rule.access_type);

            // Tree step = 1 means that the rule is set for the entry itself.
            if rule.tree_step == 1 && rule.entry_id == entry_id {
                if access_type == StorageAccessType::Allow {
                    // The entry itself allows the requested action for at least one of
                    // the provided user groups. Short-circuit and return immediately.
                    return Ok(StorageAccessCheckResult::Explicit(true));
                }
            }

            if rule.executor_type == "user" {
                if rule.executor_id == user_id {
                    user_rule = access_type;
                }
            } else if rule.executor_type == "user_group" {
                if let Some(entry) = group_rules.get_mut(&rule.executor_id) {
                    if entry == &mut StorageAccessType::Unset {
                        *entry = access_type;
                    }
                } else {
                    group_rules.insert(rule.executor_id, access_type);
                }
            }
        }

        // Allow if there is a target user rule that allows the action
        // TODO Keep in mind that we are not checking if the user is DENIED! We treat denial
        // ^ the same as we treat user group denial - we do not care as long as there is at
        // ^ least one ALLOW (100x deny & 1x allow = allow)
        // ^ Maybe for the `user` executor type it should work differently? If target user
        // ^ is explicitly denied - deny the action, even if there is an allow rule for some
        // ^ user group?
        // If we change this logic, don't forget to also update the bulk check function
        if user_rule == StorageAccessType::Allow {
            return Ok(StorageAccessCheckResult::Explicit(true));
        }

        Ok(StorageAccessCheckResult::Inherited(group_rules))
    } else {
        Err(tree_rules.unwrap_err())
    }
}

/**
 * Check if provided user groups can perorm the requested action on the provided storage entry.
 *
 * @param endpoint_id id of the storage endpoint where the provided entry is located.
 * @param entry_id entry's id.
 * @param action requested action. For example, "delete". See `storage_access_action_type`
 * data type in the database schema for a list of available action types.
 * @param user_groups ids of the user groups that are being checked.
 * @param pool database connection pool.
 *
 * @returns true if the requested action can be performed on the provided entry by a member of
 * provided user groups.
 */
pub async fn check_storage_entry_access(
    endpoint_id: i32,

    entry_id: i64,

    action: &str,
    user_id: i32,
    user_groups: &Vec<i32>,

    pool: &RequestPool,
) -> bool {
    let target_endpoint = get_storage_endpoint(endpoint_id, pool).await;

    match target_endpoint {
        Err(_) => {
            return false;
        }
        Ok(target_endpoint) => {
            if !target_endpoint.access_rules_enabled {
                return true;
            }
        }
    };

    let mut action_allowed = false;

    let mut explicitly_allowed = false;
    let mut explicitly_denied = false;

    let check_result = get_storage_entry_access_rule_cascade_up(
        endpoint_id,
        entry_id,
        action,
        user_id,
        user_groups,
        pool,
    )
    .await;

    match check_result {
        Ok(check_result) => match check_result {
            StorageAccessCheckResult::Explicit(explicit_access_type) => {
                explicitly_allowed = explicit_access_type;
            }

            StorageAccessCheckResult::Inherited(group_rules) => {
                for group_id in user_groups {
                    if let Some(group_rule) = group_rules.get(group_id) {
                        match group_rule {
                            StorageAccessType::Deny => {
                                explicitly_denied = true;
                            }
                            StorageAccessType::Allow => {
                                explicitly_allowed = true;
                            }
                            _ => {}
                        }
                    }
                }
            }
        },

        Err(err) => {
            error!("{:?}", err);
            return false;
        }
    }

    // Not denied and not allowed by any rules. This means that the entry access is
    // inherited all the way from the endpoint root. Check if user has access to the endpoint root.
    if !explicitly_denied && !explicitly_allowed {
        let group_rights = get_group_rights(&pool, user_groups).await;

        action_allowed = check_endpoint_root_access(endpoint_id, group_rights);
    }

    // Explicitly denied by a rule and not allowed by any rules. 100% denied
    if explicitly_denied && !explicitly_allowed {
        action_allowed = false;
    }

    // Explicitly allowed by some rule. 100% allowed, even if denied by some other rule
    if explicitly_allowed {
        action_allowed = true;
    }

    action_allowed
}

/**
 * Check if provided user groups can perorm the requested action on provided storage entries.
 *
 * For each tested entry, *at least one* of the provided user groups must be allowed to perform
 * the requested action for that entry to be considered "accessible". That means that an
 * entry can have multiple rules that deny the requested action for different user groups,
 * but as long as at least one rule allows the requested action for at least one of the provided
 * user groups, the entry will be considered "accessible".
 *
 * This function tests provided entries in bulk.
 *
 * @param endpoint_id id of the storage endpoint where all the provided entries are located.
 * @param entries entries to be checked.
 * @param action requested action. For example, "delete". See `storage_access_action_type`
 * data type in the database schema for a list of available action types.
 * @param user_groups ids of the user groups that are being checked.
 * @param pool database connection pool.
 *
 * @returns true if the requested action can be performed on *all* the provided entries by
 * a member of provided user groups. False if at least one entry denies the requested action
 * for the provided user groups.
 */
pub async fn check_bulk_storage_entries_access_cascade_up(
    endpoint_id: i32,
    entries: &Vec<i64>,

    action: &str,
    user_id: i32,
    user_groups: &Vec<i32>,

    pool: &RequestPool,
) -> bool {
    let target_endpoint = get_storage_endpoint(endpoint_id, pool).await;

    match target_endpoint {
        Err(_) => {
            return false;
        }
        Ok(target_endpoint) => {
            if !target_endpoint.access_rules_enabled {
                return true;
            }
        }
    };

    // TODO: Return a list of entries that have denied access
    // ^ This will be slower, but more convenient for the user.
    // It would be nice to show an error message and allow the user
    // to just ignore the entries that have denied access (and perform
    // the requested action for the rest of the entries).

    #[derive(FromRow, Serialize, Debug)]
    pub struct RootResultRow {
        entry_id: i64,

        parent_folder: Option<i64>,

        access_type: Option<String>,
    }

    #[derive(FromRow, Serialize, Debug)]
    pub struct StorageGenerateEntriesAccessTreeRow {
        tree_step: i32,
        entry_id: i64,
        access_type: String,
        executor_type: String,
        executor_id: i32,
        target_entry_id: i64,
    }

    // Get access rules for the provided entries themeselves
    // TODO optimize. Is one Select possible here?
    let root_result = sqlx::query_as::<_, RootResultRow>(
        "SELECT storage_entries.id AS entry_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_id  FROM storage_entries
        LEFT JOIN storage_access ON
        storage_access.entry_id = storage_entries.id
        AND storage_access.endpoint_id = storage_entries.endpoint_id
        AND storage_access.action = $3::storage_access_action_type
        AND storage_access.access_type != 'inherit'::storage_access_type
        AND
        (
            (storage_access.executor_type = 'user_group'::storage_access_executor_type
            AND storage_access.executor_id = ANY($4))
            OR
            (storage_access.executor_type = 'user'::storage_access_executor_type
            AND storage_access.executor_id = $5)
        )
        WHERE storage_entries.endpoint_id = $2 AND storage_entries.id = ANY($1)",
    )
    .bind(&entries)
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(user_id)
    .fetch_all(pool)
    .await;

    if root_result.is_err() {
        error!("{:?}", root_result.unwrap_err());

        return false;
    }

    let root_result = root_result.unwrap();

    let mut parent_folders_for_inheriting_entries_set: HashSet<i64> = HashSet::new();
    let mut root_entries_access: HashMap<i64, StorageAccessType> = HashMap::new();

    for entry in &root_result {
        let entry_access_type = if let Some(access_type) = &entry.access_type {
            StorageAccessType::from_str(access_type)
        } else {
            StorageAccessType::Unset
        };

        if entry_access_type == StorageAccessType::Unset {
            if let Some(parent_folder) = entry.parent_folder {
                parent_folders_for_inheriting_entries_set.insert(parent_folder);
            }
        } else {
            if let Some(entry) = root_entries_access.get_mut(&entry.entry_id) {
                if *entry != StorageAccessType::Allow {
                    *entry = entry_access_type;
                }
            } else {
                root_entries_access.insert(entry.entry_id, entry_access_type);
            }
        }
    }

    for (_, access_type) in &root_entries_access {
        if *access_type == StorageAccessType::Deny {
            return false;
        }
    }

    // No entries that have explicitly denied access, and no entries are inheriting access rules from
    // their parents. We are done here, the action is allowed.
    if parent_folders_for_inheriting_entries_set.is_empty() {
        return true;
    }

    // Looks like none of the target entries have *explicitly* denied access. Now let's recursively check
    // their parents, maybe some of the target entries inherit denying access rules from their parents.
    let parent_folders_for_inheriting_entries_ids = parent_folders_for_inheriting_entries_set
        .iter()
        .map(|folder| folder.clone())
        .collect::<Vec<i64>>();

    let tree_result_for_inheriting_entries = sqlx::query_as::<_, StorageGenerateEntriesAccessTreeRow>(
        "SELECT tree_step, entry_id, access_type::TEXT, executor_type::TEXT, executor_id, target_entry_id FROM storage_generate_entries_access_tree($1, $2::storage_access_action_type, $3, $4, $5)",
    )
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(user_id)
    .bind(parent_folders_for_inheriting_entries_ids)
    .fetch_all(pool)
    .await;

    if tree_result_for_inheriting_entries.is_err() {
        error!("{:?}", tree_result_for_inheriting_entries.unwrap_err());

        return false;
    }

    let tree_result_for_inheriting_entries = tree_result_for_inheriting_entries.unwrap();

    // TODO ew @cleanup
    let group_rights = get_group_rights(&pool, user_groups).await;

    let entry_root_access = check_endpoint_root_access(endpoint_id, group_rights);

    // Parents of the target entries have no access rules set for the requested action.
    // That means that the action access is inherited all the way from the endpoint root.
    if tree_result_for_inheriting_entries.is_empty() {
        return entry_root_access;
    }

    let mut last_target_entry_id = tree_result_for_inheriting_entries[0].target_entry_id;

    let mut allow_found = false;
    let mut deny_found = false;
    let mut at_least_one_inheriting_from_root = false;

    for tree_step in tree_result_for_inheriting_entries {
        if last_target_entry_id != tree_step.target_entry_id {
            if deny_found {
                if !allow_found {
                    return false;
                }
            } else {
                if !allow_found {
                    at_least_one_inheriting_from_root = true;
                }
            }

            // We have processed one entry, reset the state and move on to the next one.
            deny_found = false;
            allow_found = false;
            last_target_entry_id = tree_step.target_entry_id;
        }

        if tree_step.access_type == "deny" {
            deny_found = true;
        } else if tree_step.access_type == "allow" {
            allow_found = true;
        }
    }

    // Check the result of the last tree step
    // TODO ew @cleanup
    if deny_found {
        if !allow_found {
            return false;
        }
    } else {
        if !allow_found {
            at_least_one_inheriting_from_root = true;
        }
    }

    if at_least_one_inheriting_from_root {
        entry_root_access
    } else {
        true
    }
}
