use actix_web::{get, web, HttpResponse, Responder};

use crate::storage_endpoint::get_storage_endpoint;
use crate::{request::error, user::get_client_rights};

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

    let endpoint = get_storage_endpoint(endpoint_id, &pool).await;

    match endpoint {
        Ok(endpoint) => HttpResponse::Ok().json(web::Json(endpoint)),
        Err(_) => error("storage_endpoint.internal"),
    }
}
