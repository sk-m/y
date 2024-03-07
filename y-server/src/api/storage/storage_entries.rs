use actix_web::web::Query;
use actix_web::{get, web, HttpResponse, Responder};
use log::*;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::user::get_client_rights;
use crate::util::RequestPool;

#[derive(Serialize, FromRow, Debug)]
struct StorageEntryRow {
    id: i64,
    parent_folder: Option<i64>,
    name: String,
    extension: Option<String>,
    entry_type: String,
    mime_type: Option<String>,
    size_bytes: Option<i64>,
    created_by: Option<i32>,
    created_at: Option<String>,
}

#[derive(Serialize)]
struct StorageEntriesOutput {
    entries: Vec<StorageEntryRow>,
}

#[derive(Deserialize)]
struct QueryParams {
    endpoint_id: i64,
    folder_id: Option<i64>,
}

#[get("/entries")]
async fn storage_entries(
    pool: web::Data<RequestPool>,
    query: Query<QueryParams>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_list"))
        .is_some();

    if !action_allowed {
        return error("storage.entries.unauthorized");
    }

    let endpoint_id = query.endpoint_id;
    let folder_id = query.folder_id;

    let entries = if folder_id.is_some() {
        // Entries inside of a folder

        sqlx::query_as::<_, StorageEntryRow>(
            "SELECT id, name, parent_folder, NULL as extension, NULL as mime_type, NULL as size_bytes, NULL as created_by, NULL as created_at, 'folder' as entry_type FROM storage_folders WHERE endpoint_id = $1 AND parent_folder = $2 UNION ALL SELECT id, name, parent_folder, extension, mime_type, size_bytes, created_by, created_at::TEXT, 'file' as entry_type FROM storage_files WHERE endpoint_id = $1 AND parent_folder = $2",
        )
        .bind(endpoint_id)
        .bind(folder_id)
        .fetch_all(&**pool)
        .await
    } else {
        // Entries on the root level

        sqlx::query_as::<_, StorageEntryRow>(
            "SELECT id, name, parent_folder, NULL as extension, NULL as mime_type, NULL as size_bytes, NULL as created_by, NULL as created_at, 'folder' as entry_type FROM storage_folders WHERE endpoint_id = $1 AND parent_folder IS NULL UNION ALL SELECT id, name, parent_folder, extension, mime_type, size_bytes, created_by, created_at::TEXT, 'file' as entry_type FROM storage_files WHERE endpoint_id = $1 AND parent_folder IS NULL",
        )
        .bind(endpoint_id)
        .fetch_all(&**pool)
        .await
    };

    if entries.is_err() {
        error!("{:?}", entries.unwrap_err());

        return error("storage.entries.internal");
    }

    HttpResponse::Ok().json(web::Json(StorageEntriesOutput {
        entries: entries.unwrap(),
    }))
}
