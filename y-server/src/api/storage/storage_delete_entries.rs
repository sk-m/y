use actix_web::{delete, web, HttpResponse, Responder};
use log::*;
use serde::{Deserialize, Serialize};

use crate::{
    request::error,
    storage_access::check_bulk_storage_entries_access_cascade_up,
    storage_endpoint::get_storage_endpoint,
    storage_entry::delete_entries,
    user::{get_user_from_request, get_user_groups},
    util::RequestPool,
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
    let form = form.into_inner();
    let endpoint_id = form.endpoint_id;
    let target_folders = form.folder_ids;
    let target_files = form.file_ids;

    let client = get_user_from_request(&**pool, &req).await;

    // Perform a cascade up check for the target entries
    // Cascade down check will be performed inside the delete_entries function
    if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        let action_allowed_cascade_up = check_bulk_storage_entries_access_cascade_up(
            endpoint_id,
            (&target_files, &target_folders),
            "delete",
            &group_ids,
            &**pool,
        )
        .await;

        if !action_allowed_cascade_up {
            return error("storage.delete_entries.unauthorized");
        }

        // TODO we query for the endpoint twice, we should only do it once
        // (second time in the delete_entries function)
        let target_endpoint = get_storage_endpoint(endpoint_id, &pool).await;

        if target_endpoint.is_err() {
            return error("storage.delete_entries.endpoint_not_found");
        }

        if target_endpoint.unwrap().status != "active" {
            return error("storage.delete_entries.endpoint_not_active");
        }

        // TODO make sure that folderids are actually folders and fileids are actually files
        let result = delete_entries(
            endpoint_id,
            target_folders,
            target_files,
            Some(&group_ids),
            &**pool,
        )
        .await;

        match result {
            Ok((deleted_files, deleted_folders)) => {
                return HttpResponse::Ok().json(StorageDeleteEntriesOutput {
                    deleted_files,
                    deleted_folders,
                });
            }
            Err(err) => {
                // TODO implement a better approach to internal errors
                if err == "Unauthorized" {
                    return error("storage.delete_entries.unauthorized");
                }

                error!("{}", err);
                return error("storage.delete_entries.internal");
            }
        }
    } else {
        return error("storage.delete_entries.unauthorized");
    }
}
