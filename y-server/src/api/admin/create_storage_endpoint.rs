use std::fs;

use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize)]
struct CreateStorageEndpointOutput {
    id: i32,
}

#[derive(Deserialize, Validate)]
struct CreateStorageEndpointInput {
    #[validate(length(min = 1, max = 127))]
    name: String,

    endpoint_type: String,
    access_rules_enabled: bool,

    #[validate(length(min = 1, max = 511))]
    base_path: String,

    #[validate(length(min = 1, max = 511))]
    artifacts_path: String,

    #[validate(length(min = 0, max = 255))]
    description: String,
}

#[post("/storage/endpoints")]
async fn create_storage_endpoint(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateStorageEndpointInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() || form.endpoint_type != "local_fs" {
        return error("create_storage_endpoint.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_endpoints"))
        .is_some();

    if !action_allowed {
        return error("create_storage_endpoint.unauthorized");
    }

    let base_path = std::path::Path::new(&form.base_path);
    let artifacts_path = std::path::Path::new(&form.artifacts_path);

    for path in &[base_path, artifacts_path] {
        if !path.exists() {
            return error("create_storage_endpoint.path_does_not_exist");
        }

        if !path.is_dir() {
            return error("create_storage_endpoint.path_not_a_directory");
        }

        if !path.is_absolute() {
            return error("create_storage_endpoint.path_not_absolute");
        }
    }

    let result = sqlx::query_scalar("INSERT INTO storage_endpoints (name, endpoint_type, status, access_rules_enabled, base_path, artifacts_path, description) VALUES ($1, $2::storage_endpoint_type, $3::storage_endpoint_status, $4, $5, $6, $7) RETURNING id")
        .bind(form.name)
        .bind(form.endpoint_type)
        .bind("active")
        .bind(form.access_rules_enabled)
        .bind(form.base_path)
        .bind(&form.artifacts_path)
        .bind(form.description)
        .fetch_one(&**pool)
        .await;

    return match result {
        Ok(new_endpoint_id) => {
            fs::create_dir(artifacts_path.join("thumbnails")).unwrap();

            HttpResponse::Ok().json(web::Json(CreateStorageEndpointOutput {
                id: new_endpoint_id,
            }))
        }
        Err(_) => error("create_storage_endpoint.other"),
    };
}
