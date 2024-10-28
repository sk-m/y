use actix_web::http::header::{self, HeaderValue};
use log::*;
use std::path::Path;

use actix_web::{get, web, Responder};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::storage_access::check_storage_entry_access;
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;

#[derive(Serialize, FromRow)]
struct StorageEntryAndBasePathRow {
    name: String,
    extension: Option<String>,
    filesystem_id: String,
    mime_type: Option<String>,
    base_path: String,
    artifacts_path: Option<String>,
}

#[derive(Deserialize)]
struct StorageGetQuery {
    preview: Option<bool>,
}

#[get("/entries/{endpoint_id}/get/{file_id}")]
async fn storage_get(
    pool: web::Data<RequestPool>,
    path: web::Path<(i32, i64)>,
    req: actix_web::HttpRequest,
    query: web::Query<StorageGetQuery>,
) -> impl Responder {
    let query = query.into_inner();
    let is_preview = query.preview.unwrap_or(false);

    let (endpoint_id, file_id) = path.into_inner();

    let client = get_user_from_request(&**pool, &req).await;

    let action_allowed = if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        check_storage_entry_access(
            endpoint_id,
            file_id,
            "download",
            client_user.id,
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
        "SELECT storage_entries.name, storage_entries.extension, storage_entries.filesystem_id, storage_entries.mime_type, storage_endpoints.base_path, storage_endpoints.artifacts_path FROM storage_entries
        RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id
        WHERE storage_entries.id = $1 AND endpoint_id = $2",
    )
    .bind(file_id)
    .bind(endpoint_id)
    .fetch_one(&**pool)
    .await;

    match entry {
        Ok(entry) => {
            let mut is_preview_version = false;

            // TODO cleanup
            let file_path = if is_preview {
                if let Some(artifacts_path) = &entry.artifacts_path {
                    let browser_friendly_version_path = Path::new(artifacts_path)
                        .join("preview_videos")
                        .join(&entry.filesystem_id)
                        .with_extension("mp4");

                    if browser_friendly_version_path.exists() {
                        is_preview_version = true;

                        browser_friendly_version_path
                    } else {
                        Path::new(&entry.base_path).join(&entry.filesystem_id)
                    }
                } else {
                    Path::new(&entry.base_path).join(&entry.filesystem_id)
                }
            } else {
                Path::new(&entry.base_path).join(&entry.filesystem_id)
            };

            let file = actix_files::NamedFile::open(file_path).unwrap();

            let mut res = file.into_response(&req);

            res.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(
                    // TODO we can also use the `immutable` directive
                    "private, stale-while-revalidate, max-age=432000", // 432000 = 5 days
                ),
            );

            if is_preview_version {
                // It seems that the default value for this header is already `inline`,
                // so this does not have any actual effect. We do this just to be more explicit.
                res.headers_mut().insert(
                    header::CONTENT_DISPOSITION,
                    HeaderValue::from_static("inline"),
                );
            }

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
