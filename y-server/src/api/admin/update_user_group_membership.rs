use serde::Deserialize;
use sqlx::QueryBuilder;

use crate::{
    request::error,
    user::{get_user_from_request, get_user_rights},
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
    let session_info = get_user_from_request(&pool, req).await;

    if let Some((client_user, _)) = session_info {
        let client_rights = get_user_rights(&pool, client_user.id).await;

        let action_allowed = client_rights
            .iter()
            .find(|right| {
                right.right_name.eq("assign_user_groups")
                    && right
                        .right_options
                        .get("allow_assigning_any_group")
                        .and_then(|value| value.as_bool())
                        .unwrap_or(false)
            })
            .is_some();

        if !action_allowed {
            return error("update_user_group_membership.unauthorized");
        }
    } else {
        return error("update_user_group_membership.unauthorized");
    }

    let user_id = path.into_inner();

    let transaction = pool.begin().await;

    if let Ok(mut transaction) = transaction {
        let unassign_groups_result =
            sqlx::query("DELETE FROM user_group_membership WHERE user_id = $1")
                .bind(user_id)
                .execute(&mut *transaction)
                .await;

        if unassign_groups_result.is_err() {
            return error("update_user_group_membership.other");
        }

        let mut groups_query_builder =
            QueryBuilder::new("INSERT INTO user_group_membership(user_id, group_id) ");

        let assigned_groups = form
            .into_inner()
            .user_groups
            .into_iter()
            .collect::<Vec<i32>>();

        if assigned_groups.len() > 0 {
            groups_query_builder.push_values(assigned_groups, |mut b, group_id| {
                b.push_bind(user_id).push_bind(group_id);
            });

            let assign_groups_result = groups_query_builder
                .build()
                .execute(&mut *transaction)
                .await;

            if assign_groups_result.is_err() {
                return error("update_user_group_membership.other");
            }
        }

        let result = transaction.commit().await;

        match result {
            Ok(_) => {
                return HttpResponse::Ok().body("{}");
            }
            Err(_) => return error("update_user_group_membership.other"),
        }
    } else {
        return error("update_user_group_membership.other");
    }
}
