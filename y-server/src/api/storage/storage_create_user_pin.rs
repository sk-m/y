use crate::util::RequestPool;
use crate::{request::error, user::get_user_from_request};
use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize)]
struct CreateStorageUserPinOutput {
    pin_id: i32,
}

#[derive(Deserialize, Validate)]
struct CreateStorageUserPinInput {
    #[validate(length(min = 1, max = 255))]
    name: String,

    endpoint_id: i32,
    entry_id: i64,
}

#[post("/user-pins")]
async fn storage_create_user_pin(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateStorageUserPinInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("storage.invalid_input");
    }

    let user = get_user_from_request(&**pool, &req).await;

    if let Some((user, _)) = user {
        let create_pin_result = sqlx::query_scalar("INSERT INTO storage_user_pins (user_id, endpoint_id, entry_id, name) VALUES ($1, $2, $3, $4) RETURNING pin_id")
            .bind(user.id)
            .bind(form.endpoint_id)
            .bind(form.entry_id)
            .bind(form.name)
            .fetch_one(&**pool)
            .await;

        return match create_pin_result {
            Ok(new_pin_id) => HttpResponse::Ok()
                .json(web::Json(CreateStorageUserPinOutput { pin_id: new_pin_id })),
            Err(_) => error("storage.internal"),
        };
    } else {
        error("storage.access_denied")
    }
}
