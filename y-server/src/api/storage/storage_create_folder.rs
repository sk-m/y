use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::{request::error, user::get_client_rights, util::RequestPool};

#[derive(Deserialize)]
struct StorageCreateFolderInput {
    endpoint_id: i32,
    target_folder: Option<i64>,

    new_folder_name: String,
}

#[derive(Serialize)]
struct StorageCreateFolderOutput {
    new_folder_id: i64,
}

#[post("/create-folder")]
async fn storage_create_folder(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageCreateFolderInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "storage_upload");

    if !action_allowed {
        return error("storage.create_folder.unauthorized");
    }

    let form = form.into_inner();
    let is_root = form.target_folder.is_none();

    let new_folder_id = if is_root {
        sqlx::query_scalar::<_, i64>(
            "INSERT INTO storage_folders (endpoint_id, parent_folder, name) VALUES ($1, NULL, $2) RETURNING id",
        )
        .bind(form.endpoint_id)
        .bind(form.new_folder_name)
        .fetch_one(&**pool)
        .await
    } else {
        sqlx::query_scalar::<_, i64>(
            "INSERT INTO storage_folders (endpoint_id, parent_folder, name) VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(form.endpoint_id)
        .bind(form.target_folder)
        .bind(form.new_folder_name)
        .fetch_one(&**pool)
        .await
    };

    match new_folder_id {
        Ok(new_folder_id) => {
            HttpResponse::Ok().json(web::Json(StorageCreateFolderOutput { new_folder_id }))
        }
        Err(_) => error("storage.create_folder.internal"),
    }
}
