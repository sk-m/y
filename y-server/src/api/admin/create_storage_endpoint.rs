use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct CreateStorageEndpointOutput {
    id: i32,
}

#[derive(Deserialize)]
struct CreateStorageEndpointInput {
    name: String,
    endpoint_type: String,
    preserve_file_structure: bool,
    base_path: String,
    description: String,
}

#[post("/storage/endpoints")]
async fn create_storage_endpoint(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateStorageEndpointInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_endpoints"))
        .is_some();

    if !action_allowed {
        return error("create_storage_endpoint.unauthorized");
    }

    let form = form.into_inner();

    let result = sqlx::query_scalar("INSERT INTO storage_endpoints (name, endpoint_type, status, preserve_file_structure, base_path, description) VALUES ($1, $2::storage_endpoint_type, $3::storage_endpoint_status, $4, $5, $6) RETURNING id")
        .bind(form.name)
        .bind(form.endpoint_type)
        .bind("active")
        .bind(form.preserve_file_structure)
        .bind(form.base_path)
        .bind(form.description)
        .fetch_one(&**pool)
        .await;

    return match result {
        Ok(new_endpoint_id) => HttpResponse::Ok().json(web::Json(CreateStorageEndpointOutput {
            id: new_endpoint_id,
        })),
        Err(_) => error("create_storage_endpoint.other"),
    };
}