use std::sync::Mutex;

use actix_web::{patch, web, HttpResponse, Responder};
use serde::Deserialize;
use validator::Validate;

use crate::request::error;
use crate::storage_access::check_storage_entry_access;
use crate::storage_entry::rename_entry;
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;
use crate::ws::WSState;

#[derive(Deserialize, Validate)]
struct StorageRenameEntryInput {
    endpoint_id: i32,
    entry_id: i64,

    #[validate(length(min = 1, max = 255))]
    name: String,
}

#[patch("/rename-entry")]
async fn storage_rename_entry(
    pool: web::Data<RequestPool>,
    ws_state: web::Data<Mutex<WSState>>,
    form: web::Json<StorageRenameEntryInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("storage.invalid_input");
    }

    let client = get_user_from_request(&**pool, &req).await;

    let action_allowed = if let Some((client_user, _)) = &client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        check_storage_entry_access(
            form.endpoint_id,
            form.entry_id,
            "rename",
            client_user.id,
            &group_ids,
            &**pool,
        )
        .await
    } else {
        false
    };

    if !action_allowed {
        return error("storage.access_denied");
    }

    let endpoint_id = form.endpoint_id;
    let entry_id = form.entry_id;
    let name = form.name;

    let result = rename_entry(endpoint_id, entry_id, name.as_str(), &pool).await;

    match result {
        Ok(parent_folder) => {
            // TODO don't block the request
            ws_state
                .lock()
                .unwrap()
                .send_storage_location_updated(
                    client.map(|(user, _)| user.id),
                    endpoint_id,
                    vec![parent_folder],
                    true,
                    false,
                )
                .await;

            HttpResponse::Ok().body("{}")
        }
        Err(err) => error(&err.get_code()),
    }
}
