use actix_web::{patch, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::request::error;
use crate::storage_entry::{rename_entry, StorageEntryType};
use crate::user::get_client_rights;
use crate::util::RequestPool;

#[derive(Deserialize)]
struct StorageRenameEntryInput {
    endpoint_id: i32,
    entry_type: StorageEntryType,
    entry_id: i64,
    name: String,
}

#[patch("/rename-entry")]
async fn storage_rename_entry(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageRenameEntryInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_rename"))
        .is_some();

    if !action_allowed {
        return error("storage.rename.unauthorized");
    }

    let form = form.into_inner();
    let endpoint_id = form.endpoint_id;
    let entry_type = form.entry_type;
    let entry_id = form.entry_id;
    let name = form.name;

    let result = rename_entry(endpoint_id, entry_type, entry_id, name.as_str(), &pool).await;

    match result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage.rename.other"),
    }
}
