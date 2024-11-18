use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::{
    request::error,
    storage_access::{check_endpoint_root_access, check_storage_entry_access},
    storage_endpoint::get_storage_endpoint,
    user::{get_group_rights, get_user_from_request, get_user_groups},
    util::RequestPool,
};

#[derive(Deserialize, Validate)]
struct StorageCreateFolderInput {
    endpoint_id: i32,
    target_folder: Option<i64>,

    #[validate(length(min = 1, max = 255))]
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
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("storage.invalid_input");
    }

    let is_root = form.target_folder.is_none();

    let client = get_user_from_request(&**pool, &req).await;

    if client.is_none() {
        return error("storage.access_denied");
    }

    let target_endpoint = get_storage_endpoint(form.endpoint_id, &pool).await;

    if target_endpoint.is_err() {
        return error("storage.endpoint_not_found");
    }

    if target_endpoint.unwrap().status != "active" {
        return error("storage.endpoint_not_active");
    }

    let (client_user, _) = client.unwrap();

    let user_groups = get_user_groups(&**pool, client_user.id).await;
    let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

    if !is_root {
        let action_allowed = check_storage_entry_access(
            form.endpoint_id,
            form.target_folder.unwrap(),
            "upload",
            client_user.id,
            &group_ids,
            &**pool,
        )
        .await;

        if !action_allowed {
            return error("storage.access_denied");
        }
    } else {
        let group_rights = get_group_rights(&*pool, &group_ids).await;
        let root_access = check_endpoint_root_access(form.endpoint_id, group_rights);

        if !root_access {
            return error("storage.access_denied");
        }
    }

    let new_folder_id = if is_root {
        sqlx::query_scalar::<_, i64>(
            "INSERT INTO storage_entries (endpoint_id, parent_folder, name, entry_type, created_by) VALUES ($1, NULL, $2, 'folder'::storage_entry_type, $3) RETURNING id",
        )
        .bind(form.endpoint_id)
        .bind(form.new_folder_name)
        .bind(client_user.id)
        .fetch_one(&**pool)
        .await
    } else {
        sqlx::query_scalar::<_, i64>(
            "INSERT INTO storage_entries (endpoint_id, parent_folder, name, entry_type, created_by) VALUES ($1, $2, $3, 'folder'::storage_entry_type, $4) RETURNING id",
        )
        .bind(form.endpoint_id)
        .bind(form.target_folder)
        .bind(form.new_folder_name)
        .bind(client_user.id)
        .fetch_one(&**pool)
        .await
    };

    match new_folder_id {
        Ok(new_folder_id) => {
            HttpResponse::Ok().json(web::Json(StorageCreateFolderOutput { new_folder_id }))
        }
        Err(_) => error("storage.internal"),
    }
}
