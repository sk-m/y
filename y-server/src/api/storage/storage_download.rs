use log::*;
use std::path::Path;

use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::web::Query;
use actix_web::{get, web, Responder};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::storage_access::check_storage_entry_access;
use crate::storage_entry::StorageEntryType;
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;

#[derive(Serialize, FromRow)]
struct StorageEntryAndBasePathRow {
    name: String,
    extension: Option<String>,
    filesystem_id: String,
    base_path: String,
}

#[derive(Deserialize)]
struct StorageDownloadInput {
    file_id: Option<i64>,
}

#[get("/entries/{endpoint_id}/download")]
async fn storage_download(
    pool: web::Data<RequestPool>,
    query: Query<StorageDownloadInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    if query.file_id.is_none() {
        return error("storage.download.file_id_required");
    }

    let endpoint_id = path.into_inner();
    let file_id = query.file_id.unwrap();

    let client = get_user_from_request(&**pool, &req).await;

    let action_allowed = if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        check_storage_entry_access(
            endpoint_id,
            &StorageEntryType::File,
            file_id,
            "download",
            &group_ids,
            &**pool,
        )
        .await
    } else {
        false
    };

    if !action_allowed {
        return error("storage.download.unauthorized");
    }

    let entry = sqlx::query_as::<_, StorageEntryAndBasePathRow>(
        "SELECT storage_entries.name, storage_entries.extension, storage_entries.filesystem_id, storage_endpoints.base_path FROM storage_entries
        RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id
        WHERE storage_entries.id = $1 AND endpoint_id = $2 AND storage_entries.entry_type = 'file'::storage_entry_type",
    )
    .bind(file_id)
    .bind(endpoint_id)
    .fetch_one(&**pool)
    .await;

    match entry {
        Ok(entry) => {
            let file_path = Path::new(&entry.base_path).join(&entry.filesystem_id);

            let mut file = actix_files::NamedFile::open(file_path).unwrap();

            let raw_filename = format!(
                "{}.{}",
                entry.name,
                entry.extension.unwrap_or("".to_string())
            );

            file = file.set_content_disposition(ContentDisposition {
                disposition: DispositionType::Attachment,
                parameters: vec![DispositionParam::Filename(raw_filename)],
            });

            return file.into_response(&req);
        }

        Err(err) => {
            error!("{}", err);

            return error("storage.download.internal");
        }
    }
}
