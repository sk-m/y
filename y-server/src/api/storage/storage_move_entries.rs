use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::request::error;
use crate::storage_entry::move_entries;
use crate::user::get_client_rights;
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
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_move"))
        .is_some();

    if !action_allowed {
        return error("storage.move.unauthorized");
    }

    let form = form.into_inner();
    let endpoint_id = form.endpoint_id;
    let target_folder_id = form.target_folder_id;
    let entry_ids = form.entry_ids;

    let result = move_entries(endpoint_id, entry_ids, target_folder_id, &**pool).await;

    match result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage.move.other"),
    }
}
