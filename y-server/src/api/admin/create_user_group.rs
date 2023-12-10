use crate::user::get_user_rights;
use crate::util::RequestPool;
use crate::{request::error, user::get_user_from_request};
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
    req: actix_web::HttpRequest,
) -> impl Responder {
    let session_info = get_user_from_request(&pool, req).await;

    if let Some((client_user, _)) = session_info {
        let client_rights = get_user_rights(&pool, client_user.id).await;

        let manage_user_groups_right = client_rights
            .iter()
            .find(|right| right.right_name.eq("manage_user_groups"));

        if let Some(manage_user_groups_right) = manage_user_groups_right {
            let action_allowed = manage_user_groups_right
                .right_options
                .get("allow_creating_user_groups")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);

            if !action_allowed {
                return error("create_user_group.unauthorized");
            }
        } else {
            return error("create_user_group.unauthorized");
        }
    } else {
        return error("create_user_group.unauthorized");
    }

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
