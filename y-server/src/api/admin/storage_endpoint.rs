use actix_web::{get, web, HttpResponse, Responder};

use crate::{request::error, storage_endpoint::StorageEndpoint, user::get_client_rights};

use crate::util::RequestPool;

#[get("/storage/endpoints/{endpoint_id}")]
async fn storage_enpoint(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_endpoints"))
        .is_some();

    if !action_allowed {
        return error("storage_endpoint.unauthorized");
    }

    let endpoint_id = path.into_inner();

    let endpoint = sqlx::query_as::<_, StorageEndpoint>("SELECT id, name, endpoint_type::TEXT, status::TEXT, preserve_file_structure, base_path, description FROM storage_endpoints WHERE id = $1")
        .bind(endpoint_id)
        .fetch_one(&**pool)
        .await;

    match endpoint {
        Ok(endpoint) => HttpResponse::Ok().json(web::Json(endpoint)),
        Err(_) => error("storage_endpoint.internal"),
    }
}
