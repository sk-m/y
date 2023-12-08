use actix_web::{get, web, HttpResponse, Responder};
use chrono::NaiveDateTime as Timestamp;
use serde::Serialize;

use crate::request::error;

use crate::util::RequestPool;

#[derive(Serialize)]
struct UserOutput {
    id: i32,
    username: String,
    created_at: String,

    user_groups: Vec<i32>,
}

#[derive(sqlx::FromRow)]
struct UserRow {
    group_id: Option<i32>,
    username: String,
    user_created_at: Timestamp,
}

#[get("/users/{user_id}")]
async fn user(pool: web::Data<RequestPool>, path: web::Path<i32>) -> impl Responder {
    let user_id = path.into_inner();

    let user_rows = sqlx::query_as::<_, UserRow>("SELECT user_groups.id as group_id, users.username, users.created_at as user_created_at FROM user_groups RIGHT OUTER JOIN user_group_membership ON user_groups.id = user_group_membership.group_id RIGHT OUTER JOIN users ON user_group_membership.user_id = users.id
    WHERE users.id = $1")
        .bind(user_id)
        .fetch_all(&**pool).await;

    match user_rows {
        Ok(user_rows) => {
            if user_rows.len() == 0 {
                return error("users.not_found");
            }

            let username = user_rows[0].username.clone();
            let created_at = user_rows[0].user_created_at.clone();

            // TODO refactor this mess please
            let group_ids = user_rows
                .iter()
                .map(|entry| entry.group_id)
                .filter(|id| id.is_some())
                .map(|id| id.unwrap())
                .collect::<Vec<i32>>();

            return HttpResponse::Ok().json(web::Json(UserOutput {
                id: user_id,
                username,
                created_at: created_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),

                user_groups: group_ids,
            }));
        }
        Err(err) => {
            dbg!(err);
            return error("users.internal");
        }
    }
}
