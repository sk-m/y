use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

use crate::{request::error, storage_endpoint::StorageEndpointRow, user::get_client_rights};

use crate::util::RequestPool;

#[derive(Serialize)]
struct StorageEndpointsOutput {
    storage_endpoints: Vec<StorageEndpointRow>,
}

#[get("/storage/endpoints")]
async fn storage_enpoints(
    pool: web::Data<RequestPool>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_endpoints"))
        .is_some();

    if !action_allowed {
        return error("storage_endpoints.unauthorized");
    }

    let endpoints = sqlx::query_as::<_, StorageEndpointRow>("SELECT id, name, endpoint_type::TEXT, status::TEXT, preserve_file_structure, base_path, artifacts_path, description FROM storage_endpoints")
        .fetch_all(&**pool)
        .await;

    match endpoints {
        Ok(endpoints) => HttpResponse::Ok().json(web::Json(StorageEndpointsOutput {
            storage_endpoints: endpoints,
        })),
        Err(_) => error("storage_endpoints.internal"),
    }
}
