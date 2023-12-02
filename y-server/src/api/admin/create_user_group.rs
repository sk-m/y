use crate::request::error;
use crate::util::RequestPool;
use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;

#[derive(serde::Serialize)]
struct CreateUserGroupOutput {
    id: i32,
}

#[derive(Deserialize)]
struct CreateUserGroupInput {
    name: String,
}

#[post("/user-groups")]
async fn create_user_group(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateUserGroupInput>,
) -> impl Responder {
    let name = form.name.clone();

    let result = sqlx::query_scalar("INSERT INTO user_groups (name) VALUES ($1) RETURNING id")
        .bind(name)
        .fetch_one(&**pool)
        .await;

    return match result {
        Ok(new_group_id) => {
            HttpResponse::Ok().json(web::Json(CreateUserGroupOutput { id: new_group_id }))
        }
        Err(_) => error("create_user_group.other"),
    };
}
