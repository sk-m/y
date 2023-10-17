use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

use crate::request::{error, TableInput, DEFAULT_LIMIT};
use futures::join;

use crate::user::User;
use crate::util::RequestPool;

#[derive(Serialize)]
struct UserOutput {
    id: i32,
    username: String,
    created_at: String,
}

#[derive(Serialize)]
struct UsersOutput {
    users: Vec<UserOutput>,
    total_count: i64,
}

#[get("/users")]
async fn users(pool: web::Data<RequestPool>, query: web::Query<TableInput>) -> impl Responder {
    let search = query.search.clone().unwrap_or("".to_string());

    let order_by = match query.order_by.as_ref() {
        Some(order_by) => match order_by.as_str() {
            "username" => "username",
            _ => "created_at",
        },
        None => "created_at",
    };

    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE username LIKE '%' || $1 || '%' ORDER BY $2 LIMIT $3 OFFSET $4",
    )
    .bind(search)
    .bind(order_by)
    .bind(query.limit.unwrap_or(DEFAULT_LIMIT))
    .bind(query.skip.unwrap_or(0))
    .fetch_all(&**pool);

    let users_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users").fetch_one(&**pool);

    let (users, users_count) = join!(users, users_count);

    match users {
        Ok(users) => {
            let users_json = users
                .iter()
                .map(|user| UserOutput {
                    id: user.id,
                    username: user.username.clone(),
                    created_at: user.created_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                })
                .collect::<Vec<UserOutput>>();

            return HttpResponse::Ok().json(web::Json(UsersOutput {
                users: users_json,
                total_count: users_count.unwrap_or(0),
            }));
        }
        Err(err) => {
            dbg!(err);
            return error("users.internal");
        }
    }
}
