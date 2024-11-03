use std::sync::Mutex;

use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::request::error;
use crate::storage_access::{
    check_bulk_storage_entries_access_cascade_up, check_endpoint_root_access,
    check_storage_entry_access,
};
use crate::storage_entry::move_entries;
use crate::user::{get_group_rights, get_user_from_request, get_user_groups};
use crate::util::RequestPool;
use crate::ws::WSState;

#[derive(Deserialize)]
struct StorageMoveEntriesInput {
    endpoint_id: i32,
    entry_ids: Vec<i64>,
    target_folder_id: Option<i64>,
}

#[post("/move-entries")]
async fn storage_move_entries(
    pool: web::Data<RequestPool>,
    ws_state: web::Data<Mutex<WSState>>,
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

    if let Some((client_user, _)) = &client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        target_upload_allowed = if let Some(target_folder_id) = target_folder_id {
            check_storage_entry_access(
                endpoint_id,
                target_folder_id,
                "upload",
                client_user.id,
                &group_ids,
                &**pool,
            )
            .await
        } else {
            let group_rights = get_group_rights(&pool, &group_ids).await;

            check_endpoint_root_access(endpoint_id, group_rights)
        };

        move_allowed = if target_upload_allowed {
            check_bulk_storage_entries_access_cascade_up(
                endpoint_id,
                &entry_ids,
                "move",
                client_user.id,
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

    let source_parent_folders = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT DISTINCT parent_folder FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2)",
    )
    .bind(endpoint_id)
    .bind(&entry_ids)
    .fetch_all(&**pool).await;

    let result = move_entries(endpoint_id, &entry_ids, target_folder_id, &**pool).await;

    match result {
        Ok(_) => {
            if let Ok(mut folders_to_update) = source_parent_folders {
                // TODO don't block the request here
                folders_to_update.push(target_folder_id);

                ws_state
                    .lock()
                    .unwrap()
                    .send_storage_location_updated(
                        client.map(|(user, _)| user.id),
                        endpoint_id,
                        folders_to_update,
                    )
                    .await;
            }

            HttpResponse::Ok().body("{}")
        }
        Err(_) => error("storage.move.other"),
    }
}
