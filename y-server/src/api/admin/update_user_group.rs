use std::collections::HashMap;

use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{patch, web, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::QueryBuilder;
use validator::Validate;

#[derive(Deserialize)]
struct Right {
    granted: bool,
    options: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize, Validate)]
struct UpdateUserGroupInput {
    #[validate(length(min = 1, max = 255))]
    name: Option<String>,
    rights: Option<HashMap<String, Right>>,
}

#[patch("/user-groups/{user_group_id}")]
async fn update_user_group(
    pool: web::Data<RequestPool>,
    form: web::Json<UpdateUserGroupInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("update_user_group.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_user_groups"))
        .is_some();

    if !action_allowed {
        return error("update_user_group.unauthorized");
    }

    let user_group_id = path.into_inner();

    let updated_name = &form.name.is_some();
    let updated_rights = &form.rights.is_some().clone();

    if *updated_name {
        let name = &form.name.unwrap();

        let result = sqlx::query("UPDATE user_groups SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(user_group_id)
            .execute(&**pool)
            .await;

        if result.is_err() {
            return error("update_user_group.internal");
        }
    }

    if *updated_rights {
        let transaction = pool.begin().await;

        if let Ok(mut transaction) = transaction {
            let delete_rights_result =
                sqlx::query("DELETE FROM user_group_rights WHERE group_id = $1")
                    .bind(user_group_id)
                    .execute(&mut *transaction)
                    .await;

            if delete_rights_result.is_err() {
                return error("update_user_group.internal");
            }

            let mut rights_query_builder = QueryBuilder::new(
                "INSERT INTO user_group_rights(group_id, right_name, right_options) ",
            );

            let assigned_rigths = form
                .rights
                .unwrap()
                .into_iter()
                .filter(|right| right.1.granted)
                .collect::<HashMap<String, Right>>();

            if assigned_rigths.len() > 0 {
                rights_query_builder.push_values(assigned_rigths, |mut b, (right_name, right)| {
                    b.push_bind(user_group_id)
                        .push_bind(right_name)
                        .push_bind(serde_json::to_value(right.options).unwrap());
                });

                let assign_rights_result = rights_query_builder
                    .build()
                    .execute(&mut *transaction)
                    .await;

                if assign_rights_result.is_err() {
                    return error("update_user_group.internal");
                }
            }

            let result = transaction.commit().await;

            if result.is_err() {
                return error("update_user_group.internal");
            }
        } else {
            return error("update_user_group.internal");
        }
    }

    return HttpResponse::Ok().body("{}");
}
