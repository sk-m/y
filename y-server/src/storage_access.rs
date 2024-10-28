use std::collections::{HashMap, HashSet};

use log::error;
use serde::Serialize;
use sqlx::FromRow;

use crate::{
    storage_endpoint::get_storage_endpoint,
    user::{get_group_rights, UserRight},
    util::RequestPool,
};

#[derive(PartialEq, Debug, Serialize, Clone)]
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
    // user_group_id: (Access Type, Rule Source, Tree Step)
    Inherited(HashMap<i32, (StorageAccessType, i32, i32)>),
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

#[derive(FromRow, Debug)]
pub struct ProccessEntryRuleInput {
    pub rule_source: i32,
    pub tree_step: i32,
    pub entry_id: i64,
    pub access_type: Option<String>,
    pub executor_type: Option<String>,
    pub executor_id: Option<i32>,

    #[sqlx(default)]
    pub parent_folder: Option<i64>,
    #[sqlx(default)]
    pub target_entry_id: Option<i64>,
    #[sqlx(default)]
    pub filesystem_id: Option<String>,
}

/**
 * Calculate access rules for a single entry.
 *
 * One entry can have multiple different rules. Some are set for that entry itself (explicit rules),
 * others can be inherited from the parent folders, all the way to the root of the endpoint.
 *
 * There are also different kinds of rules. Some define access rules for specific users, others for user groups.
 * Finally, there are also two different rule "sources" (or "priorities") - custom rules (2) and template rules (1).
 * (Higher rule_source number means higher priority).
 *
 * This function processes all the different rules related to *one specific entry*, both *explicit and inherited rules*.
 *
 * Note that this function does not decide if a client has access to perform some action on the entry or not.
 * It only calculates the rules and returns the final info on which groups and users (only one user is checked)
 * have access to to perform the action. The final "access allowed" or "access denied" decision should be made outside,
 * based on the info returned by this function.
 *
 * All rules should be from the same entry (or inherited *for that entry*), same action,
 * and same executor user (rules with executor_type == "user" should have the same executor_id).
 *
 * @param rules list of rules related to the entry.
 *
 * @returns tuple containing:
 * 1. Access decision for user groups. [user_group_id: (Access Type, Rule Source, Tree Step)]
 * 2. Access decision for the user. [(Access Type, Rule Source, Tree Step)]
 */
pub fn process_storage_entry(
    rules: &[ProccessEntryRuleInput],
) -> (
    HashMap<i32, (StorageAccessType, i32, i32)>,
    (StorageAccessType, i32, i32),
) {
    let mut group_rules: HashMap<i32, (StorageAccessType, i32, i32)> = HashMap::new();
    let mut user_rule: (StorageAccessType, i32, i32) = (StorageAccessType::Unset, -1, 1);

    // TODO! Are we sure we need to compare rule_sources? The SQL query will always ORDER BY rule_source DESC.
    // I think we should just rely on the input data. The higher rule source will always be processed first, so no overrides should happen, hence no checks and no keeping track of rule_source.
    // Don't forget to update the function docs if you change this! Specify that the input slice should be sorted in a specific way.
    // TODO! check if what I said above is true. I'm not sure...

    for rule in rules {
        // TODO This function should not accept executor_type or executor_id as Options. They should always be set.
        if rule.executor_type.is_none() || rule.executor_id.is_none() {
            continue;
        }

        let executor_type = rule.executor_type.as_ref().unwrap();
        let executor_id = rule.executor_id.unwrap();

        // TODO use enum instead of string. SQLX should support automatic conversion from string to enum
        let access_type = if let Some(access_type) = &rule.access_type {
            StorageAccessType::from_str(access_type)
        } else {
            StorageAccessType::Unset
        };

        match executor_type.as_str() {
            // TODO Enum instead of string!
            "user" => {
                // If the current user access type is not yet determined, or if the rule we are processing has a higher priority,
                // update our current determined user access type.
                // We check if tree_step is the same because we don't want a rule from higher up a tree overriding a rule
                // from lower down.
                if user_rule.0 == StorageAccessType::Unset

                    // ! TODO what I said above. I think this check ALWAYS returns false and is redundant
                    || (rule.tree_step == user_rule.2 && rule.rule_source > user_rule.1)
                // ! ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                {
                    user_rule = (access_type, rule.rule_source, rule.tree_step);
                }
            }
            "user_group" => {
                if access_type != StorageAccessType::Unset {
                    if let Some(entry) = group_rules.get_mut(&executor_id) {
                        // We already have an access rule set for this group. Check if the rule we are processing has a higher priority and is not sourced from higher up the tree than the current value.

                        // TODO! what I said above. I think this check ALWAYS returns false and is redundant
                        if rule.tree_step == (*entry).2 && rule.rule_source > (*entry).1 {
                            (*entry).0 = access_type;
                        }
                    } else {
                        // We have not seen this group "mentioned" in a rule before. Add it to the map.
                        group_rules
                            .insert(executor_id, (access_type, rule.rule_source, rule.tree_step));
                    }
                }
            }
            _ => {}
        }
    }

    (group_rules, user_rule)
}

async fn get_storage_entry_access_rule_cascade_up(
    endpoint_id: i32,
    entry_id: i64,

    action: &str,

    user_id: i32,
    user_groups: &Vec<i32>,

    pool: &RequestPool,
) -> Result<StorageAccessCheckResult, sqlx::Error> {
    let tree_rules = sqlx::query_as::<_, ProccessEntryRuleInput>("
        SELECT tree.tree_step::INT4, 2 AS rule_source, storage_access.entry_id, NULL as template_id, storage_access.access_type::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM (SELECT row_number() OVER () AS tree_step, id AS entry_id FROM storage_get_folder_path($1, $2)) AS tree

        JOIN storage_access
        ON storage_access.entry_id = tree.entry_id

        WHERE storage_access.endpoint_id = $1
        AND storage_access.action = $3::storage_access_action_type
        AND (
            (storage_access.executor_type = 'user_group'::storage_access_executor_type AND storage_access.executor_id = ANY($4))
        OR
            (storage_access.executor_type = 'user'::storage_access_executor_type AND storage_access.executor_id = $5)
        )

        UNION ALL

        SELECT tree.tree_step::INT4, 1 AS rule_source, tree.entry_id, storage_access_template_rules.template_id, storage_access_template_rules.access_type::TEXT, storage_access_template_rules.executor_type::TEXT, storage_access_template_rules.executor_id
        FROM (SELECT row_number() OVER () AS tree_step, id AS entry_id FROM storage_get_folder_path($1, $2)) AS tree

        JOIN storage_access_template_entries
        ON storage_access_template_entries.entry_id = tree.entry_id

        JOIN storage_access_template_rules
        ON storage_access_template_entries.template_id = storage_access_template_rules.template_id

        WHERE storage_access_template_entries.entry_endpoint_id = $1
        AND storage_access_template_rules.action = $3::storage_access_action_type
        AND (
            (storage_access_template_rules.executor_type = 'user_group'::storage_access_executor_type AND storage_access_template_rules.executor_id = ANY($4))
        OR
            (storage_access_template_rules.executor_type = 'user'::storage_access_executor_type AND storage_access_template_rules.executor_id = $5)
        )

        ORDER BY tree_step ASC, rule_source DESC
    ")
        .bind(&endpoint_id)
        .bind(&entry_id)
        .bind(action)
        .bind(user_groups)
        .bind(user_id)
        .fetch_all(pool)
        .await;

    match tree_rules {
        Ok(tree_rules) => {
            let (group_rules, user_rule) = process_storage_entry(&tree_rules);

            if user_rule.0 == StorageAccessType::Allow || user_rule.0 == StorageAccessType::Deny {
                return Ok(StorageAccessCheckResult::Explicit(user_rule.0));
            }

            Ok(StorageAccessCheckResult::Inherited(group_rules))
        }
        Err(err) => Err(err),
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
            StorageAccessCheckResult::Explicit(access_type) => {
                if access_type == StorageAccessType::Allow {
                    explicitly_allowed = true;
                } else if access_type == StorageAccessType::Deny {
                    explicitly_denied = true;
                }
            }

            StorageAccessCheckResult::Inherited(group_rules) => {
                for group_id in user_groups {
                    if let Some(group_rule) = group_rules.get(group_id) {
                        match group_rule.0 {
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

    // Get access rules for the provided entries themeselves. No tree traversal here.
    let root_result = sqlx::query_as::<_, ProccessEntryRuleInput>(
        "SELECT 1 AS tree_step, storage_entries.id AS entry_id, 2 AS rule_source, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM storage_entries

        LEFT JOIN storage_access
        ON storage_access.entry_id = storage_entries.id
        AND storage_access.endpoint_id = storage_entries.endpoint_id
        AND storage_access.action = $3::storage_access_action_type
        AND storage_access.access_type != 'inherit'::storage_access_type
        AND (
            (storage_access.executor_type = 'user_group'::storage_access_executor_type
            AND storage_access.executor_id = ANY($4))
            OR
            (storage_access.executor_type = 'user'::storage_access_executor_type
            AND storage_access.executor_id = $5)
        )

        WHERE storage_entries.endpoint_id = $2
        AND storage_entries.id = ANY($1)

        UNION ALL

        SELECT 1 AS tree_step, storage_entries.id AS entry_id, 1 AS rule_source, storage_entries.parent_folder, storage_access_template_rules.access_type::TEXT, storage_access_template_rules.executor_type::TEXT, storage_access_template_rules.executor_id FROM storage_entries

        LEFT JOIN storage_access_template_entries
        ON storage_access_template_entries.entry_id = storage_entries.id

        LEFT JOIN storage_access_template_rules
        ON storage_access_template_entries.template_id = storage_access_template_rules.template_id
        AND storage_access_template_entries.entry_endpoint_id = storage_entries.endpoint_id
        AND storage_access_template_rules.action = $3::storage_access_action_type
        AND storage_access_template_rules.access_type != 'inherit'::storage_access_type
        AND (
            (storage_access_template_rules.executor_type = 'user_group'::storage_access_executor_type
            AND storage_access_template_rules.executor_id = ANY($4))
            OR
            (storage_access_template_rules.executor_type = 'user'::storage_access_executor_type
            AND storage_access_template_rules.executor_id = $5)
        )

        WHERE storage_entries.endpoint_id = $2
        AND storage_entries.id = ANY($1)

        ORDER BY entry_id ASC, rule_source DESC",
    )
    .bind(&entries)
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(user_id)
    .fetch_all(pool)
    .await;

    if root_result.is_err() {
        return false;
    }

    let root_result = root_result.unwrap();

    let mut parent_folders_for_inheriting_entries_set: HashSet<i64> = HashSet::new();
    let mut at_least_one_inheriting_from_root = false;

    let mut last_entry_id = root_result[0].entry_id;
    let mut start_i = 0;

    // Break up the rows from the database into slices. Each slice contains rules for one entry.
    for i in 0..root_result.len() {
        let _rule = &root_result[i];

        if _rule.entry_id != last_entry_id || i == root_result.len() - 1 {
            let end_i = if i == root_result.len() - 1 { i + 1 } else { i };

            // _rule is NOT the entry we are currenly processing! It's the next one! Hence the _ prefix
            let target_entry = &root_result[start_i];

            let (result_groups, result_user) = process_storage_entry(&root_result[start_i..end_i]);

            // Early check. If a *target (selected) entry* denies access, we are already done here.
            if result_user.0 == StorageAccessType::Deny
                || (!result_groups.is_empty()
                    && result_groups
                        .values()
                        .all(|x| x.0 == StorageAccessType::Deny))
            {
                return false;
            }

            // The entry is inheriting rules from somewhere up the tree
            if result_user.0 == StorageAccessType::Unset && (result_groups.is_empty()) {
                if let Some(parent_folder_id) = target_entry.parent_folder {
                    parent_folders_for_inheriting_entries_set.insert(parent_folder_id);
                } else {
                    at_least_one_inheriting_from_root = true;
                }
            }

            start_i = i;
        }

        last_entry_id = _rule.entry_id;
    }

    if parent_folders_for_inheriting_entries_set.is_empty() {
        // No entries have explicitly denied access, and no entries are inheriting access rules from
        // their parents. We are done here, the action is allowed.

        println!("No entries that have explicitly denied access, and no entries are inheriting access rules from their parents. We are done here, the action is allowed.");

        return true;
    }

    println!("None of selected entries have denied access and some of them are inheriting access rules from their parents, now we need to go up the tree and check");

    // Looks like none of the target entries have *explicitly* denied access. Now let's recursively check
    // their parents, they might have inherited access rules from their parents.
    let parent_folders_for_inheriting_entries_ids = parent_folders_for_inheriting_entries_set
        .iter()
        .map(|folder| folder.clone())
        .collect::<Vec<i64>>();

    let tree_result_for_inheriting_entries = sqlx::query_as::<_, ProccessEntryRuleInput>(
        "SELECT tree_step, rule_source, entry_id, template_id, access_type::TEXT, executor_type::TEXT, executor_id, target_entry_id FROM storage_generate_entries_access_tree($1, $2::storage_access_action_type, $3, $4, $5)",
    )
    .bind(endpoint_id)
    .bind(action)
    .bind(&user_groups)
    .bind(user_id)
    .bind(parent_folders_for_inheriting_entries_ids)
    .fetch_all(pool)
    .await;

    if tree_result_for_inheriting_entries.is_err() {
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

    let mut last_target_entry_id = tree_result_for_inheriting_entries[0]
        .target_entry_id
        .unwrap();
    let mut start_i = 0;

    let mut at_least_one_allows = false;

    // Break up the rows from the database into slices. Each slice contains rules for one branch.
    // A branch starts from the *parent folder* of some target entry and goes all the way up to the root.
    // A brach DOES NOT include a target entry itself, those were processed in the previous step - multiple
    // target entries can share the same parent folder!
    for i in 0..tree_result_for_inheriting_entries.len() {
        let _rule = &tree_result_for_inheriting_entries[i];

        if _rule.target_entry_id.unwrap() != last_target_entry_id
            || i == tree_result_for_inheriting_entries.len() - 1
        {
            let end_i = if i == tree_result_for_inheriting_entries.len() - 1 {
                i + 1
            } else {
                i
            };

            let (result_groups, result_user) =
                process_storage_entry(&tree_result_for_inheriting_entries[start_i..end_i]);

            if result_user.0 == StorageAccessType::Allow
                || (!result_groups.is_empty()
                    && result_groups
                        .values()
                        .any(|x| x.0 == StorageAccessType::Allow))
            {
                at_least_one_allows = true;
            } else if result_user.0 == StorageAccessType::Deny
                || (!result_groups.is_empty()
                    && result_groups
                        .values()
                        .all(|x| x.0 == StorageAccessType::Deny))
            {
                // Early check. If some target entry inherits from a branch that denies access, then we are already done here.

                return false;
            } else if !at_least_one_inheriting_from_root
                && result_user.0 == StorageAccessType::Unset
                && (result_groups.is_empty())
            {
                at_least_one_inheriting_from_root = true;
            }

            start_i = i;
        }

        last_target_entry_id = _rule.target_entry_id.unwrap();
    }

    // At this point we have processed all the target entries and their parents. We have not found any
    // entries that either deny access or inherit access rules from a branch that denies access.
    // Lastly, we might need to check user's access to the endpoint root, if at least one entry inherits
    // rules aaaalllll the way up from the root of the endpoint. If not, we are done - access granted.

    if !at_least_one_allows {
        at_least_one_inheriting_from_root = true;
    }

    if at_least_one_inheriting_from_root {
        entry_root_access
    } else {
        true
    }
}
