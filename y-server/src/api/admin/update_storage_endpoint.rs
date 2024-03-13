use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{patch, web, HttpResponse, Responder};
use serde::Deserialize;
use validator::Validate;

#[derive(Deserialize, Validate)]
struct UpdateStorageEndpointInput {
    #[validate(length(min = 1, max = 127))]
    name: Option<String>,
    #[validate(length(min = 0, max = 255))]
    description: Option<String>,
    status: Option<String>,
}

#[patch("/storage/endpoints/{endpoint_id}")]
async fn update_storage_endpoint(
    pool: web::Data<RequestPool>,
    form: web::Json<UpdateStorageEndpointInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("update_storage_endpoint.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_endpoints"))
        .is_some();

    if !action_allowed {
        return error("update_storage_endpoiont.unauthorized");
    }

    let storage_endpoint_id = path.into_inner();

    let updated_name = &form.name.is_some();
    let updated_description = &form.description.is_some();
    let updated_status = &form.status.is_some();

    if *updated_name {
        let name = &form.name.unwrap();

        let result = sqlx::query("UPDATE storage_endpoints SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(storage_endpoint_id)
            .execute(&**pool)
            .await;

        if result.is_err() {
            return error("update_storage_endpoint.other");
        }
    }

    if *updated_description {
        let description = &form.description.unwrap();

        let result = sqlx::query("UPDATE storage_endpoints SET description = $1 WHERE id = $2")
            .bind(description)
            .bind(storage_endpoint_id)
            .execute(&**pool)
            .await;

        if result.is_err() {
            return error("update_storage_endpoint.other");
        }
    }

    if *updated_status {
        let status = &form.status.unwrap();

        if status != "active" && status != "read_only" && status != "disabled" {
            return error("update_storage_endpoint.invalid_status");
        }

        let result = sqlx::query(
            "UPDATE storage_endpoints SET status = $1::storage_endpoint_status WHERE id = $2",
        )
        .bind(status)
        .bind(storage_endpoint_id)
        .execute(&**pool)
        .await;

        if result.is_err() {
            return error("update_storage_endpoint.other");
        }
    }

    return HttpResponse::Ok().body("{}");
}
