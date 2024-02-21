use log::*;
use std::path::Path;

use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::web::Query;
use actix_web::{get, web, Responder};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::user::get_client_rights;
use crate::util::RequestPool;

#[derive(Serialize, FromRow)]
struct StorageEntryAndBasePath {
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
    path: web::Path<i64>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_download"))
        .is_some();

    if !action_allowed {
        return error("storage.download.unauthorized");
    }

    let file_id = query.file_id;
    let endpoint_id = path.into_inner();

    if file_id.is_none() {
        return error("storage.download.file_id_required");
    }

    let entry = sqlx::query_as::<_, StorageEntryAndBasePath>(
        "SELECT storage_files.name, storage_files.extension, storage_files.filesystem_id, storage_endpoints.base_path FROM storage_files
        RIGHT OUTER JOIN storage_endpoints ON storage_files.endpoint_id = storage_endpoints.id
        WHERE storage_files.id = $1 AND endpoint_id = $2",
    )
    .bind(file_id.unwrap())
    .bind(endpoint_id)
    .fetch_one(&**pool)
    .await;

    match entry {
        Ok(entry) => {
            let file_path = Path::new(&entry.base_path).join(&entry.filesystem_id);
            let mut file = actix_files::NamedFile::open_async(file_path).await.unwrap();

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
