use crate::user::get_user_rights;
use crate::util::RequestPool;
use crate::{request::error, user::get_user_from_request};
use actix_web::{delete, web, HttpResponse, Responder};

#[delete("/user-groups/{user_group_id}")]
async fn delete_user_group(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let session_info = get_user_from_request(&pool, req).await;

    if let Some((client_user, _)) = session_info {
        let client_rights = get_user_rights(&pool, client_user.id).await;

        let action_allowed = client_rights
            .iter()
            .find(|right| {
                right.right_name.eq("manage_user_groups")
                    && right
                        .right_options
                        .get("allow_deleting_user_groups")
                        .and_then(|value| value.as_bool())
                        .unwrap_or(false)
            })
            .is_some();

        if !action_allowed {
            return error("delete_user_group.unauthorized");
        }
    } else {
        return error("delete_user_group.unauthorized");
    }

    let user_group_id = path.into_inner();

    let delete_group_result = sqlx::query("DELETE FROM user_groups WHERE id = $1")
        .bind(user_group_id)
        .execute(&**pool)
        .await;

    if delete_group_result.is_err() {
        return error("delete_user_group.other");
    } else {
        return HttpResponse::Ok().body("{}");
    }
}
