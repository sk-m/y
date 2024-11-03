use serde::Deserialize;
use sqlx::QueryBuilder;

use crate::{
    request::error,
    user::{get_client_rights, get_user_groups},
};
use actix_web::{patch, web, HttpResponse, Responder};

use crate::util::RequestPool;

#[derive(Deserialize)]
struct UpdateUserGroupMembershipInput {
    user_groups: Vec<i32>,
}

#[patch("/users/{user_id}/groups")]
async fn update_user_group_membership(
    pool: web::Data<RequestPool>,
    form: web::Json<UpdateUserGroupMembershipInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    // ! TODO refactor the rights check
    let target_user_id = path.into_inner();
    let target_groups = get_user_groups(&pool, target_user_id).await;

    let client_rights = get_client_rights(&pool, &req).await;

    let input_groups = form
        .into_inner()
        .user_groups
        .into_iter()
        .collect::<Vec<i32>>();

    let mut mutated_groups: Vec<i32> = vec![];

    // Added groups
    for group_id in &input_groups {
        if !target_groups
            .iter()
            .find(|group| group.id == *group_id)
            .is_some()
        {
            mutated_groups.push(group_id.clone());
        }
    }

    // Removed groups
    for group in &target_groups {
        if !input_groups
            .iter()
            .find(|group_id| **group_id == group.id)
            .is_some()
        {
            mutated_groups.push(group.id.clone());
        }
    }

    let mut client_assignable_groups: Vec<i32> = vec![];
    let mut all_groups_allowed = false;

    for right in client_rights {
        if right.right_name.eq("assign_user_groups") {
            if let Some(all_allowed) = right.right_options.get("allow_assigning_any_group") {
                if all_allowed.as_bool().unwrap_or(false) {
                    all_groups_allowed = true;
                    break;
                }
            }

            if let Some(groups) = right.right_options.get("assignable_user_groups") {
                if groups.is_array() {
                    for group_id in groups.as_array().unwrap() {
                        if group_id.is_i64() {
                            client_assignable_groups.push(group_id.as_i64().unwrap() as i32);
                        }
                    }
                }
            }
        }
    }

    let mut action_allowed = true;

    if !all_groups_allowed {
        for group_id in &mutated_groups {
            if !client_assignable_groups.contains(group_id) {
                action_allowed = false;
                break;
            }
        }
    }

    if !action_allowed {
        return error("update_user_group_membership.unauthorized");
    }

    let transaction = pool.begin().await;

    if let Ok(mut transaction) = transaction {
        let unassign_groups_result =
            sqlx::query("DELETE FROM user_group_membership WHERE user_id = $1")
                .bind(target_user_id)
                .execute(&mut *transaction)
                .await;

        if unassign_groups_result.is_err() {
            return error("update_user_group_membership.internal");
        }

        let mut groups_query_builder =
            QueryBuilder::new("INSERT INTO user_group_membership(user_id, group_id) ");

        if input_groups.len() > 0 {
            groups_query_builder.push_values(input_groups, |mut b, group_id| {
                b.push_bind(target_user_id).push_bind(group_id);
            });

            let assign_groups_result = groups_query_builder
                .build()
                .execute(&mut *transaction)
                .await;

            if assign_groups_result.is_err() {
                return error("update_user_group_membership.internal");
            }
        }

        let result = transaction.commit().await;

        match result {
            Ok(_) => {
                return HttpResponse::Ok().body("{}");
            }
            Err(_) => return error("update_user_group_membership.internal"),
        }
    } else {
        return error("update_user_group_membership.internal");
    }
}
