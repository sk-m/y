use std::path::Path;

use actix_web::{put, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::{request::error, user::get_client_rights};

use crate::util::RequestPool;

#[derive(Deserialize)]
struct StorageEndpointVFSConfigInput {
    enabled: bool,

    writable: bool,
    mountpoint: String,
}

#[put("/storage/endpoints/{endpoint_id}/vfs")]
async fn storage_endpoint_set_vfs_config(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    form: web::Json<StorageEndpointVFSConfigInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let endpoint_id = path.into_inner();
    let form = form.into_inner();

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

    let mountpoint = Path::new(&form.mountpoint);

    if !mountpoint.exists() {
        return error("storage_vfs.mountpoint_does_not_exist");
    }

    if !mountpoint.is_dir() {
        return error("storage_vfs.mountpoint_not_a_directory");
    }

    if !mountpoint.is_absolute() {
        return error("storage_vfs.mountpoint_not_absolute");
    }

    let set_config = sqlx::query(
        "INSERT INTO storage_vfs (enabled, writable, mountpoint, endpoint_id) VALUES ($1, $2, $3,$4) ON CONFLICT (endpoint_id) DO UPDATE SET enabled = $1, writable = $2, mountpoint = $3",
    )
    .bind(&form.enabled)
    .bind(&form.writable)
    .bind(&form.mountpoint)
    .bind(&endpoint_id)
    .execute(&**pool)
    .await;

    match set_config {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage_vfs.internal"),
    }
}
