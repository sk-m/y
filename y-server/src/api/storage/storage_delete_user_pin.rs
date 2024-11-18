use crate::util::RequestPool;
use crate::{request::error, user::get_user_from_request};
use actix_web::{delete, web, HttpResponse, Responder};

#[delete("/user-pins/{pin_id}")]
async fn storage_delete_user_pin(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let user = get_user_from_request(&**pool, &req).await;

    if let Some((user, _)) = user {
        let pin_id = path.into_inner();

        let delete_pin_result =
            sqlx::query("DELETE FROM storage_user_pins WHERE pin_id = $1 AND user_id = $2")
                .bind(pin_id)
                .bind(user.id)
                .execute(&**pool)
                .await;

        if delete_pin_result.is_err() {
            return error("storage.internal");
        }

        if delete_pin_result.unwrap().rows_affected() == 0 {
            return error("delete_storage_user_pin.not_found");
        }

        HttpResponse::Ok().body("{}")
    } else {
        error("storage.access_denied")
    }
}
