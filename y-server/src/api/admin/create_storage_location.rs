use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize)]
struct CreateStorageLocationOutput {
    id: i32,
}

#[derive(Deserialize, Validate)]
struct CreateStorageLocationInput {
    #[validate(length(min = 1, max = 255))]
    name: String,

    endpoint_id: i32,
    entry_id: i64,
}

#[post("/storage/locations")]
async fn create_storage_location(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateStorageLocationInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("create_storage_location.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_locations"))
        .is_some();

    if !action_allowed {
        return error("create_storage_location.unauthorized");
    }

    let create_location_result = sqlx::query_scalar("INSERT INTO storage_locations (name, endpoint_id, entry_id) VALUES ($1, $2, $3) RETURNING id")
            .bind(form.name)
            .bind(form.endpoint_id)
            .bind(form.entry_id)
            .fetch_one(&**pool)
            .await;

    return match create_location_result {
        Ok(new_location_id) => HttpResponse::Ok().json(web::Json(CreateStorageLocationOutput {
            id: new_location_id,
        })),
        Err(_) => error("create_storage_location.other"),
    };
}
