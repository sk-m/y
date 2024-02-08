use actix_web::{delete, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::{
    request::error, storage_entry::delete_entries, user::get_client_rights, util::RequestPool,
};

#[derive(Deserialize)]
struct StorageDeleteEntriesInput {
    endpoint_id: i32,
    folder_ids: Vec<i64>,
    file_ids: Vec<i64>,
}

#[derive(Serialize)]
struct StorageDeleteEntriesOutput {
    deleted_files: usize,
    deleted_folders: usize,
}

#[delete("/entries")]
async fn storage_delete_entries(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageDeleteEntriesInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "storage_delete");

    if !action_allowed {
        return error("storage.delete_entries.unauthorized");
    }

    let form = form.into_inner();
    let endpoint_id = form.endpoint_id;
    let target_folders = form.folder_ids;
    let target_files = form.file_ids;

    // TODO! make sure that folderids are actually folders and fileids are actually files
    let result = delete_entries(endpoint_id, target_folders, target_files, &**pool).await;

    match result {
        Ok((deleted_files, deleted_folders)) => {
            return HttpResponse::Ok().json(StorageDeleteEntriesOutput {
                deleted_files,
                deleted_folders,
            });
        }
        Err(_) => {
            return error("storage.delete_entries.internal");
        }
    }
}
