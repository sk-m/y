use actix_web::http::header::{self, HeaderValue};
use log::*;
use std::path::Path;

use actix_web::{get, web, Responder};
use serde::Serialize;
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
    mime_type: Option<String>,
    base_path: String,
}

#[get("/entries/{endpoint_id}/get/{file_id}")]
async fn storage_get(
    pool: web::Data<RequestPool>,
    path: web::Path<(i32, i64)>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let (endpoint_id, file_id) = path.into_inner();

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
        return error("storage.get.unauthorized");
    }

    let entry = sqlx::query_as::<_, StorageEntryAndBasePathRow>(
        "SELECT storage_entries.name, storage_entries.extension, storage_entries.filesystem_id, storage_entries.mime_type, storage_endpoints.base_path FROM storage_entries
        RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id
        WHERE storage_entries.id = $1 AND storage_entries.entry_type = 'file'::storage_entry_type AND endpoint_id = $2",
    )
    .bind(file_id)
    .bind(endpoint_id)
    .fetch_one(&**pool)
    .await;

    match entry {
        Ok(entry) => {
            let file_path = Path::new(&entry.base_path).join(&entry.filesystem_id);
            let file = actix_files::NamedFile::open(file_path).unwrap();

            let mut res = file.into_response(&req);

            res.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(
                    // TODO we can also use the `immutable` directive
                    "private, stale-while-revalidate, max-age=432000", // 432000 = 5 days
                ),
            );

            if entry.mime_type.is_some() {
                res.headers_mut().insert(
                    header::CONTENT_TYPE,
                    HeaderValue::from_str(&entry.mime_type.unwrap()).unwrap(),
                );
            }

            return res;
        }

        Err(err) => {
            error!("{}", err);

            return error("storage.get.internal");
        }
    }
}
