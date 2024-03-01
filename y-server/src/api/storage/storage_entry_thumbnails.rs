use std::collections::HashMap;
use std::fs;
use std::path::Path;

use actix_web::web::Query;
use actix_web::{get, web, HttpResponse, Responder};
use base64::prelude::*;
use log::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::storage_endpoint::get_storage_endpoint;
use crate::user::get_client_rights;
use crate::util::RequestPool;

const MAX_ENTRIES_PER_REEQUEST: u32 = 200;

#[derive(FromRow)]
struct EntryRow {
    id: i64,
    filesystem_id: String,
}

#[derive(Deserialize)]
struct QueryParams {
    endpoint_id: i32,
    entry_ids: String,
}

#[derive(Serialize)]
struct StorageEntryThumbnaisOutput {
    thumbnails: HashMap<String, String>,
}

#[get("/entry-thumbnails")]
async fn storage_entry_thumbnails(
    pool: web::Data<RequestPool>,
    query: Query<QueryParams>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    // TODO? should we cache the thumbnails somehow?

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_list"))
        .is_some();

    if !action_allowed {
        return error("storage.entry_thumbnails.unauthorized");
    }

    let endpoint_id = query.endpoint_id;

    // TODO? cache endpoints?
    let endpoint = get_storage_endpoint(endpoint_id, &**pool).await;

    if endpoint.is_err() {
        return error("storage.entry_thumbnails.endpoint_not_found");
    }

    let endpoint = endpoint.unwrap();

    if endpoint.artifacts_path.is_none() {
        return error("storage.entry_thumbnails.artifacts_disabled");
    }

    let endpoint_artifacts_path = endpoint.artifacts_path.unwrap();

    let entry_ids_regex = Regex::new(r"^[0-9\,]+$").unwrap();
    if !entry_ids_regex.is_match(&query.entry_ids) {
        return error("storage.entry_thumbnails.invalid_entry_ids_param");
    }

    let entry_ids_split = query.entry_ids.split(",");
    let mut entries_count = 0;

    for entry_id in entry_ids_split {
        if entry_id.parse::<i64>().is_err() {
            return error("storage.entry_thumbnails.invalid_entry_ids_param");
        }

        if entries_count > MAX_ENTRIES_PER_REEQUEST {
            return error("storage.entry_thumbnails.too_many_entries_requested");
        }

        entries_count += 1;
    }

    let mut thumbnails: HashMap<String, String> = HashMap::new();

    let entries = sqlx::query_as::<_, EntryRow>(
        format!(
            "SELECT id, filesystem_id FROM storage_files WHERE endpoint_id = $1 AND id IN ({})",
            query.entry_ids
        )
        .as_str(),
    )
    .bind(endpoint_id)
    .fetch_all(&**pool)
    .await;

    match entries {
        Ok(entries) => {
            for entry in entries {
                let thumbnail_path = Path::new(endpoint_artifacts_path.as_str())
                    .join("thumbnails")
                    .join(entry.filesystem_id)
                    .with_extension("webp");

                if thumbnail_path.exists() {
                    let thumbnail = fs::read(thumbnail_path);

                    if thumbnail.is_ok() {
                        let thumbnail_base64 = BASE64_STANDARD.encode(thumbnail.unwrap());

                        thumbnails.insert(entry.id.to_string(), thumbnail_base64);
                    }
                }
            }

            return HttpResponse::Ok().json(StorageEntryThumbnaisOutput { thumbnails });
        }
        Err(e) => {
            error!("{:?}", e);
            return error("storage.entry_thumbnails.internal");
        }
    }
}
