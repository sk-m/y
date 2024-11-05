use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::{request::error, user::get_user_from_request, util::RequestPool};

#[derive(Serialize, FromRow)]
struct StorageUserPinRow {
    pin_id: i32,
    endpoint_id: i32,
    entry_id: i64,

    name: String,
}

#[derive(Serialize)]
struct StorageUserPinsOutput {
    user_pins: Vec<StorageUserPinRow>,
}

#[get("/user-pins")]
async fn storage_user_pins(
    pool: web::Data<RequestPool>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let user = get_user_from_request(&**pool, &req).await;

    if let Some((user, _)) = user {
        let user_pins = sqlx::query_as::<_, StorageUserPinRow>(
            "SELECT pin_id, name, endpoint_id, entry_id FROM storage_user_pins WHERE user_id = $1",
        )
        .bind(user.id)
        .fetch_all(&**pool)
        .await;

        match user_pins {
            Ok(user_pins) => {
                HttpResponse::Ok().json(web::Json(StorageUserPinsOutput { user_pins }))
            }
            Err(_) => error("storage.internal"),
        }
    } else {
        error("storage.access_denied")
    }
}
