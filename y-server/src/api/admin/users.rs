use actix_web::{get, web, HttpResponse, Responder};
use diesel::prelude::*;
use serde::Serialize;

use crate::models::user::User;
use crate::request::{error, TableInput, DEFAULT_LIMIT};
use crate::schema;

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
async fn users(pool: RequestPool, query: web::Query<TableInput>) -> impl Responder {
    let connection = web::block(move || pool.get()).await;

    let mut connection = connection
        .unwrap()
        .expect("Could not get a connection from the pool.");

    let mut users_query = schema::users::table.into_boxed();
    let mut count_query = schema::users::table.into_boxed();

    if let Some(search) = query.search.as_ref() {
        users_query = users_query.filter(schema::users::username.like(format!("%{}%", search)));
        count_query = count_query.filter(schema::users::username.like(format!("%{}%", search)));
    }

    if let Some(order_by) = query.order_by.as_ref() {
        users_query = match order_by.as_str() {
            "username" => users_query.order(schema::users::username),
            _ => users_query.order(schema::users::username),
        };
    }

    let users = users_query
        .limit(query.limit.unwrap_or(DEFAULT_LIMIT))
        .offset(query.skip.unwrap_or(0))
        .select(User::as_select())
        .load::<User>(&mut connection);

    let users_count = count_query.count().get_result::<i64>(&mut connection);

    if let Ok(users) = users {
        let users_json = users
            .iter()
            .map(|user| UserOutput {
                id: user.id,
                username: user.username.clone(),
                created_at: user.created_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            })
            .collect::<Vec<UserOutput>>();

        HttpResponse::Ok().json(web::Json(UsersOutput {
            users: users_json,
            total_count: users_count.unwrap_or(0),
        }))
    } else {
        error("users.internal")
    }
}
