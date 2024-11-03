use std::sync::Mutex;

use actix_web::{delete, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::{
    request::error,
    storage_access::check_bulk_storage_entries_access_cascade_up,
    storage_endpoint::get_storage_endpoint,
    storage_entry::{delete_entries, StorageError},
    user::{get_user_from_request, get_user_groups},
    util::RequestPool,
    ws::WSState,
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
    ws_state: web::Data<Mutex<WSState>>,
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
    if let Some((client_user, _)) = &client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        let all_entries_ids = target_files
            .iter()
            .chain(target_folders.iter())
            .copied()
            .collect();

        let action_allowed_cascade_up = check_bulk_storage_entries_access_cascade_up(
            endpoint_id,
            &all_entries_ids,
            "delete",
            client_user.id,
            &group_ids,
            &**pool,
        )
        .await;

        if !action_allowed_cascade_up {
            return error("storage.access_denied");
        }

        // TODO we query for the endpoint twice, we should only do it once
        // (second time in the delete_entries function)
        let target_endpoint = get_storage_endpoint(endpoint_id, &pool).await;

        if target_endpoint.is_err() {
            return error("storage.endpoint_not_found");
        }

        if target_endpoint.unwrap().status != "active" {
            return error("storage.endpoint_not_active");
        }

        let source_parent_folders = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT parent_folder FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2)",
        )
        .bind(endpoint_id)
        .bind(&all_entries_ids)
        .fetch_all(&**pool)
        .await;

        // TODO make sure that folderids are actually folders and fileids are actually files
        let delete_result = delete_entries(
            endpoint_id,
            target_folders,
            target_files,
            Some((client_user.id, &group_ids)),
            &**pool,
        )
        .await;

        match delete_result {
            Ok((deleted_files, deleted_folders)) => {
                if let Ok(folders_to_update) = source_parent_folders {
                    // TODO don't block the request here
                    ws_state
                        .lock()
                        .unwrap()
                        .send_storage_location_updated(
                            client.map(|(user, _)| user.id),
                            endpoint_id,
                            folders_to_update,
                            true,
                            false,
                        )
                        .await;
                }

                return HttpResponse::Ok().json(StorageDeleteEntriesOutput {
                    deleted_files,
                    deleted_folders,
                });
            }
            Err(err) => {
                if err == StorageError::AccessDenied {
                    return error("storage.access_denied");
                }

                return error("storage.internal");
            }
        }
    } else {
        return error("storage.access_denied");
    }
}
