use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;
use validator::Validate;

#[derive(serde::Serialize)]
struct CreateUserGroupOutput {
    id: i32,
}

#[derive(Deserialize, Validate)]
struct CreateUserGroupInput {
    #[validate(length(min = 1, max = 255))]
    name: String,
}

#[post("/user-groups")]
async fn create_user_group(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateUserGroupInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("create_user_group.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| {
            right.right_name.eq("manage_user_groups")
                && right
                    .right_options
                    .get("allow_creating_user_groups")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false)
        })
        .is_some();

    if !action_allowed {
        return error("create_user_group.unauthorized");
    }

    let name = form.name;

    let result = sqlx::query_scalar("INSERT INTO user_groups (name) VALUES ($1) RETURNING id")
        .bind(name)
        .fetch_one(&**pool)
        .await;

    return match result {
        Ok(new_group_id) => {
            HttpResponse::Ok().json(web::Json(CreateUserGroupOutput { id: new_group_id }))
        }
        Err(_) => error("create_user_group.internal"),
    };
}
