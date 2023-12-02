use std::collections::HashMap;

use crate::request::error;
use crate::util::RequestPool;
use actix_web::{patch, web, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::QueryBuilder;

#[derive(Deserialize)]
struct Right {
    granted: bool,
    options: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize)]
struct UpdateUserGroupInput {
    rights: HashMap<String, Right>,
}

#[patch("/user-groups/{user_group_id}")]
async fn update_user_group(
    pool: web::Data<RequestPool>,
    form: web::Json<UpdateUserGroupInput>,
    path: web::Path<i32>,
) -> impl Responder {
    let user_group_id = path.into_inner();

    let transaction = pool.begin().await;

    if let Ok(mut transaction) = transaction {
        let delete_rights_result = sqlx::query("DELETE FROM user_group_rights WHERE group_id = $1")
            .bind(user_group_id)
            .execute(&mut *transaction)
            .await;

        if delete_rights_result.is_err() {
            return error("update_user_group.other");
        }

        let mut rights_query_builder = QueryBuilder::new(
            "INSERT INTO user_group_rights(group_id, right_name, right_options) ",
        );

        let assigned_rigths = form
            .into_inner()
            .rights
            .into_iter()
            .filter(|right| right.1.granted)
            .collect::<HashMap<String, Right>>();

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
            return error("update_user_group.other");
        }

        let result = transaction.commit().await;

        match result {
            Ok(_) => {
                return HttpResponse::Ok().body("{}");
            }
            Err(_) => return error("update_user_group.other"),
        }
    } else {
        return error("update_user_group.other");
    }
}
