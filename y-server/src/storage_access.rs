use std::collections::{HashMap, HashSet};

use serde::Serialize;
use sqlx::FromRow;

use crate::{
    storage_endpoint::get_storage_endpoint, storage_entry::StorageEntryType, util::RequestPool,
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
    Explicit(StorageAccessType),
    Inherited(HashMap<i32, StorageAccessType>),
}

async fn get_storage_entry_access_rule_cascade_up(
    endpoint_id: i32,
    entry_type: &StorageEntryType,
    entry_id: i64,

    action: &str,
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
    }

    // TODO this can be optimized.
    // TODO this is just fucking sad ):
    let sql = if *entry_type == StorageEntryType::Folder {
        "SELECT tree_step, entry_id, access_type::TEXT, action::TEXT, executor_type::TEXT, executor_id FROM
        (SELECT storage_access.*, parents_tree.id AS tree_entry_id, parents_tree.tree_step FROM (SELECT * FROM storage_access) AS storage_access, (SELECT row_number() OVER () as tree_step, id FROM storage_get_folder_path($1, $2)) AS parents_tree) as sub
        WHERE entry_id IN (SELECT tree_entry_id) AND endpoint_id = sub.endpoint_id AND entry_type = 'folder'::storage_entry_type AND action = $3::storage_access_action_type AND executor_id = ANY($4)
        ORDER BY tree_step ASC"
    } else {
        "-- entry itself
        SELECT 0 AS tree_step, entry_id, access_type::TEXT, action::TEXT, executor_type::TEXT, executor_id FROM storage_access WHERE entry_id = $2 AND endpoint_id = $1 AND entry_type = 'file'::storage_entry_type AND action = $3::storage_access_action_type AND executor_id = ANY($4)
        UNION ALL
        -- entry's parent, grandparent, ... up the tree until root
        SELECT tree_step, entry_id, access_type::TEXT, action::TEXT, executor_type::TEXT, executor_id FROM
        (SELECT storage_access.*, parents_tree.id AS tree_entry_id, parents_tree.tree_step FROM (SELECT * FROM storage_access) AS storage_access, (SELECT row_number() OVER () as tree_step, id FROM storage_get_folder_path($1, (SELECT parent_folder FROM storage_entries WHERE entry_type = 'file'::storage_entry_type AND id = $2 AND endpoint_id = $1))) AS parents_tree) as sub
        WHERE entry_id IN (SELECT tree_entry_id) AND endpoint_id = sub.endpoint_id AND entry_type = 'folder'::storage_entry_type AND action = $3::storage_access_action_type AND executor_id = ANY($4)
        -- sort by tree_step to get the rules in the correct order
        ORDER BY tree_step ASC"
    };

    let tree_rules = sqlx::query_as::<_, StorageAccessRuleRow>(sql)
        .bind(&endpoint_id)
        .bind(&entry_id)
        .bind(action)
        .bind(user_groups)
        .fetch_all(pool)
        .await;

    dbg!(&action, &tree_rules);

    let mut group_rules: HashMap<i32, StorageAccessType> = HashMap::new();

    if let Ok(tree_rules) = tree_rules {
        for rule in &tree_rules {
            // TODO groups only for now
            if rule.executor_type != "user_group" {
                continue;
            }

            let access_type = StorageAccessType::from_str(&rule.access_type);

            if rule.tree_step == 0 && rule.entry_id == entry_id {
                // The rule is set for the entry itself.

                if access_type == StorageAccessType::Allow {
                    // The entry itself allows the requested action for at least one of
                    // the provided user groups. Short-circuit and return immediately.
                    return Ok(StorageAccessCheckResult::Explicit(StorageAccessType::Allow));
                }
            }

            if let Some(entry) = group_rules.get_mut(&rule.executor_id) {
                if entry == &mut StorageAccessType::Unset {
                    *entry = access_type;
                }
            } else {
                group_rules.insert(rule.executor_id, access_type);
            }
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
 * @param entry_type type of the entry (file / folder).
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

    entry_type: &StorageEntryType,
    entry_id: i64,

    action: &str,
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
        entry_type,
        entry_id,
        action,
        user_groups,
        pool,
    )
    .await;

    match check_result {
        Ok(check_result) => match check_result {
            StorageAccessCheckResult::Explicit(explicit_access_type) => {
                if explicit_access_type == StorageAccessType::Allow
                    || explicit_access_type == StorageAccessType::Unset
                {
                    return true;
                } else if explicit_access_type == StorageAccessType::Deny {
                    return false;
                }
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

        Err(_) => {
            return false;
        }
    }

    // Not denied and not allowed by any rules. Assume allowed
    if !explicitly_denied && !explicitly_allowed {
        action_allowed = true;
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
 * @param entries entries to be checked. A tuple of two vectors: the first vector contains
 * file ids, the second one contains folder ids.
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
    entries: (&Vec<i64>, &Vec<i64>),

    action: &str,
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

    let (file_ids, folder_ids) = entries;

    // TODO: Return a list of entries that have denied access
    // ^ This will be slower, but more convenient for the user.
    // It would be nice to show an error message and allow the user
    // to just ignore the entries that have denied access (and perform
    // the requested action for the rest of the entries).

    #[derive(FromRow, Serialize, Debug)]
    pub struct RootResultRow {
        entry_id: i64,
        entry_type: String,

        parent_folder: Option<i64>,

        access_type: Option<String>,
        executor_id: Option<i32>,
    }

    #[derive(FromRow, Serialize, Debug)]
    pub struct StorageGenerateEntriesAccessTreeRow {
        tree_step: i32,
        entry_id: i64,
        access_type: String,
        executor_id: i32,
        entry_type: String,
        target_entry_id: i64,
    }

    // Get access rules for the provided entries themeselves
    // TODO optimize. Is one Select possible here?
    let root_result = sqlx::query_as::<_, RootResultRow>(
        "SELECT storage_entries.id AS entry_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_id, 'file' AS entry_type FROM storage_entries
        LEFT JOIN storage_access ON
        storage_access.entry_id = storage_entries.id
        AND storage_access.endpoint_id = storage_entries.endpoint_id
        AND storage_access.entry_type = 'file'::storage_entry_type
        AND storage_access.action = $3::storage_access_action_type
        AND storage_access.access_type != 'inherit'::storage_access_type
        AND storage_access.executor_type = 'user_group'::storage_access_executor_type
        AND storage_access.executor_id = ANY($4)
        WHERE storage_entries.endpoint_id = $2 AND storage_entries.id = ANY($1) AND storage_entries.entry_type = 'file'::storage_entry_type
        UNION ALL
        SELECT storage_entries.id AS entry_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_id, 'folder' AS entry_type FROM storage_entries
        LEFT JOIN storage_access ON
        storage_access.entry_id = storage_entries.id
        AND storage_access.endpoint_id = storage_entries.endpoint_id
        AND storage_access.entry_type = 'folder'::storage_entry_type
        AND storage_access.action = $3::storage_access_action_type
        AND storage_access.access_type != 'inherit'::storage_access_type
        AND storage_access.executor_type = 'user_group'::storage_access_executor_type
        AND storage_access.executor_id = ANY($4)
        WHERE storage_entries.endpoint_id = $2 AND storage_entries.id = ANY($5) AND storage_entries.entry_type = 'folder'::storage_entry_type",
    )
    .bind(&file_ids)
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(&folder_ids)
    .fetch_all(pool)
    .await;

    if root_result.is_err() {
        dbg!(&root_result.unwrap_err());

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

    // TODO maybe can we get rid of the storage_generate_entries_access_tree function???? That would be nice, I don't like it
    let tree_result_for_inheriting_entries = sqlx::query_as::<_, StorageGenerateEntriesAccessTreeRow>(
        "SELECT tree_step, entry_id, access_type::TEXT, executor_id, entry_type::TEXT, target_entry_id FROM storage_generate_entries_access_tree($1, 'folder'::storage_entry_type, $2::storage_access_action_type, $3, $4)",
    )
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(parent_folders_for_inheriting_entries_ids)
    .fetch_all(pool)
    .await;

    if tree_result_for_inheriting_entries.is_err() {
        dbg!(&tree_result_for_inheriting_entries.unwrap_err());

        return false;
    }

    let tree_result_for_inheriting_entries = tree_result_for_inheriting_entries.unwrap();

    // Parents of the target entries have no access rules set for the requested action.
    // Therefore, the action is allowed.
    if tree_result_for_inheriting_entries.is_empty() {
        return true;
    }

    let mut last_target_entry_id = tree_result_for_inheriting_entries[0].target_entry_id;

    let mut allow_found = false;
    let mut deny_found = false;

    for tree_step in tree_result_for_inheriting_entries {
        if last_target_entry_id != tree_step.target_entry_id {
            deny_found = false;
            allow_found = false;
            last_target_entry_id = tree_step.target_entry_id;
        }

        if tree_step.access_type == "deny" {
            if !allow_found {
                return false;
            } else {
                deny_found = true;
            }
        }

        if tree_step.access_type == "allow" {
            if deny_found {
                return false;
            } else {
                allow_found = true;
            }
        }
    }

    // Parents of the target entries have no denying access rules set for the requested action.
    // The action is allowed.
    true
}
