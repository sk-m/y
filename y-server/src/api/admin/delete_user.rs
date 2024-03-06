use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{delete, web, HttpResponse, Responder};
use serde::Deserialize;

#[derive(Deserialize)]
struct DeleteUserInput {
    user_ids: Vec<i32>,
}

#[delete("/users")]
async fn delete_user(
    pool: web::Data<RequestPool>,
    form: web::Json<DeleteUserInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("delete_user"))
        .is_some();

    if !action_allowed {
        return error("delete_user.unauthorized");
    }

    let user_ids = form.into_inner().user_ids;

    let delete_users_result = sqlx::query("DELETE FROM users WHERE id = ANY($1)")
        .bind(user_ids)
        .execute(&**pool)
        .await;

    if delete_users_result.is_err() {
        return error("delete_user.other");
    } else {
        return HttpResponse::Ok().body("{}");
    }
}
