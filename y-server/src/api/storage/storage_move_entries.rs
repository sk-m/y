use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::request::error;
use crate::storage_access::{
    check_bulk_storage_entries_access_cascade_up, check_storage_entry_access,
};
use crate::storage_entry::{move_entries, StorageEntryType};
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;

#[derive(Deserialize)]
struct StorageMoveEntriesInput {
    endpoint_id: i32,
    entry_ids: Vec<i64>,
    target_folder_id: Option<i64>,
}

#[post("/move-entries")]
async fn storage_move_entries(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageMoveEntriesInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();
    let endpoint_id = form.endpoint_id;
    let target_folder_id = form.target_folder_id;
    let entry_ids = form.entry_ids;

    let client = get_user_from_request(&**pool, &req).await;

    let target_upload_allowed: bool;
    let move_allowed: bool;

    if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        target_upload_allowed = if let Some(target_folder_id) = target_folder_id {
            check_storage_entry_access(
                endpoint_id,
                &StorageEntryType::Folder,
                target_folder_id,
                "upload",
                &group_ids,
                &**pool,
            )
            .await
        } else {
            true
        };

        move_allowed = if target_upload_allowed {
            check_bulk_storage_entries_access_cascade_up(
                endpoint_id,
                &entry_ids,
                "move",
                &group_ids,
                &**pool,
            )
            .await
        } else {
            false
        }
    } else {
        move_allowed = false;
    };

    if !move_allowed {
        return error("storage.move.unauthorized");
    }

    let result = move_entries(endpoint_id, entry_ids, target_folder_id, &**pool).await;

    match result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage.move.other"),
    }
}
