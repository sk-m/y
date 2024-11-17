use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::{request::error, user::get_client_rights};

use crate::util::RequestPool;

#[derive(FromRow, Serialize)]
struct StorageEndpointVFSConfig {
    enabled: bool,

    writable: bool,
    mountpoint: String,
}

#[derive(Serialize)]
struct StorageEndpointVFSOutput {
    vfs_config: Option<StorageEndpointVFSConfig>,
}

#[get("/storage/endpoints/{endpoint_id}/vfs")]
async fn storage_enpoint_vfs(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| {
            right.right_name.eq("manage_storage_endpoints")
                && right
                    .right_options
                    .get("allow_managing_vfs")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false)
        })
        .is_some();

    if !action_allowed {
        return error("storage_vfs.unauthorized");
    }

    let endpoint_id = path.into_inner();

    let vfs_config = sqlx::query_as::<_, StorageEndpointVFSConfig>(
        "SELECT enabled, writable, mountpoint FROM storage_vfs WHERE endpoint_id = $1",
    )
    .bind(&endpoint_id)
    .fetch_one(&**pool)
    .await;

    match vfs_config {
        Ok(vfs_config) => HttpResponse::Ok().json(web::Json(StorageEndpointVFSOutput {
            vfs_config: Some(vfs_config),
        })),
        Err(_) => HttpResponse::Ok().json(web::Json(StorageEndpointVFSOutput { vfs_config: None })),
    }
}
