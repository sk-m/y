use std::collections::HashMap;
use std::fs;
use std::path::Path;

use actix_web::http::header::{self, HeaderValue};
use actix_web::web::Query;
use actix_web::{get, web, HttpResponse, Responder};
use base64::prelude::*;
use log::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::storage_access::check_storage_entry_access;
use crate::storage_endpoint::get_storage_endpoint;
use crate::storage_entry::StorageEntryType;
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;

const MAX_ENTRIES_PER_REEQUEST: usize = 200;

#[derive(FromRow)]
struct EntryRow {
    id: i64,
    filesystem_id: String,
}

#[derive(Deserialize)]
struct QueryParams {
    endpoint_id: i32,
    parent_folder_id: Option<i64>,
    file_ids: String,
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
    let endpoint_id = query.endpoint_id;
    let parent_folder_id = query.parent_folder_id;

    // TODO? this logic allows users to get thumbnails for files in a specific folder
    // ? if that folder allows the user to list entries inside of it.
    // ? Maybe we should check for the download rule for each file instead? Or should
    // ? we check for the "list_entries" rule for each file??

    // TODO: slow. This endpoint should be as fast as possible, this check is not ideal
    let action_allowed: bool;

    if let Some(parent_folder_id) = parent_folder_id {
        let client = get_user_from_request(&**pool, &req).await;

        if let Some((client_user, _)) = client {
            let user_groups = get_user_groups(&**pool, client_user.id).await;
            let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

            action_allowed = check_storage_entry_access(
                endpoint_id,
                &StorageEntryType::Folder,
                parent_folder_id,
                "list_entries",
                &group_ids,
                &**pool,
            )
            .await;
        } else {
            action_allowed = false;
        }
    } else {
        // folder_id == NULL means the root level of the endpoint
        // TODO do we want to allow everyone to get thumbnails for the root level?
        // TODO maybe we should check for the "list_entries" rule for the endpoint instead?
        // (we would have to bring back the list_entries rule)

        action_allowed = true;
    };

    if !action_allowed {
        return error("storage.entry_thumbnails.unauthorized");
    }

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

    // TODO this is a bit stupid...
    let file_ids_regex = Regex::new(r"^[0-9\,]+$").unwrap();
    if !file_ids_regex.is_match(&query.file_ids) {
        return error("storage.entry_thumbnails.invalid_file_ids_param");
    }

    let file_ids_split = query.file_ids.split(",");
    let mut file_ids_param: Vec<i64> = Vec::new();

    for file_id in file_ids_split {
        if let Ok(file_id_i64) = file_id.parse::<i64>() {
            if file_ids_param.len() > MAX_ENTRIES_PER_REEQUEST {
                return error("storage.entry_thumbnails.too_many_entries_requested");
            }

            file_ids_param.push(file_id_i64);
        } else {
            return error("storage.entry_thumbnails.invalid_file_ids_param");
        }
    }

    let mut thumbnails: HashMap<String, String> = HashMap::new();

    let file_entries = sqlx::query_as::<_, EntryRow>(if query.parent_folder_id.is_none() {
        "SELECT id, filesystem_id FROM storage_entries WHERE endpoint_id = $1 AND parent_folder IS NULL AND id = ANY($3) AND entry_type = 'file'::storage_entry_type"
    } else {
        "SELECT id, filesystem_id FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = $2 AND id = ANY($3) AND entry_type = 'file'::storage_entry_type"
    })
        .bind(endpoint_id)
        .bind(parent_folder_id)
        .bind(&file_ids_param)
        .fetch_all(&**pool)
        .await;

    match file_entries {
        Ok(file_entries) => {
            for file_entry in file_entries {
                let thumbnail_path = Path::new(endpoint_artifacts_path.as_str())
                    .join("thumbnails")
                    .join(file_entry.filesystem_id)
                    .with_extension("webp");

                if thumbnail_path.exists() {
                    let thumbnail = fs::read(thumbnail_path);

                    if thumbnail.is_ok() {
                        let thumbnail_base64 = BASE64_STANDARD.encode(thumbnail.unwrap());

                        thumbnails.insert(file_entry.id.to_string(), thumbnail_base64);
                    }
                }
            }

            let mut res = HttpResponse::Ok().json(StorageEntryThumbnaisOutput { thumbnails });

            res.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(
                    "private, stale-while-revalidate, max-age=432000", // 432000 = 5 days
                ),
            );

            return res;
        }
        Err(e) => {
            error!("{:?}", e);
            return error("storage.entry_thumbnails.internal");
        }
    }
}
