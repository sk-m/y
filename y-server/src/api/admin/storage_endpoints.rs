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

    // TODO dont use just queries. Use a general function, like get_all_storage_endpoints
    let endpoints = sqlx::query_as::<_, StorageEndpointRow>("SELECT storage_endpoints.id, storage_endpoints.name, storage_endpoints.endpoint_type::TEXT, storage_endpoints.status::TEXT, storage_endpoints.preserve_file_structure, storage_endpoints.base_path, storage_endpoints.artifacts_path, storage_endpoints.description, storage_endpoints.access_rules_enabled, storage_vfs.enabled AS vfs_enabled FROM storage_endpoints LEFT JOIN storage_vfs ON storage_vfs.endpoint_id = storage_endpoints.id")
        .fetch_all(&**pool)
        .await;

    match endpoints {
        Ok(endpoints) => HttpResponse::Ok().json(web::Json(StorageEndpointsOutput {
            storage_endpoints: endpoints,
        })),
        Err(_) => error("storage_endpoints.internal"),
    }
}
