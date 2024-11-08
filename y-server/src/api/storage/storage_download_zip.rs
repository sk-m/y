use std::collections::HashMap;
use std::path::Path;
use std::vec;

use crate::request::error;
use crate::storage_access::check_bulk_storage_entries_access_cascade_up;
use crate::storage_endpoint::get_storage_endpoint;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::{post, web, Responder};
use serde::Deserialize;

use std::fs::File;
use std::io::{Read, Write};
use zip::ZipWriter;

use crate::storage_entry::{get_subfolders_level_with_access_rules, resolve_entries};
use crate::user::{get_user_from_request, get_user_groups};
use crate::util::RequestPool;

// TODO research what the best value would be
const WRITE_FILE_CHUNK_SIZE: usize = 8192;

#[derive(Deserialize)]
struct StorageDownloadZipInput {
    folder_ids: Vec<i64>,
    file_ids: Vec<i64>,
}

#[post("/entries/{endpoint_id}/download-zip")]
async fn storage_download_zip(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageDownloadZipInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    // TODO: Cache all endpoints so we don't have to query for them every time
    let endpoint_id = path.into_inner();

    let form = form.into_inner();

    let target_endpoint = get_storage_endpoint(endpoint_id, &**pool).await;

    if target_endpoint.is_err() {
        return error("storage.endpoint_not_found");
    }

    let target_endpoint = target_endpoint.unwrap();

    if target_endpoint.status != "active" {
        return error("storage.endpoint_disabled");
    }

    let target_endpoint_base_path = target_endpoint.base_path;

    let file_ids = form.file_ids;
    let folder_ids = form.folder_ids;

    let client = get_user_from_request(&**pool, &req).await;

    if client.is_none() {
        return error("storage.access_denied");
    }

    let (user, _) = client.unwrap();
    let user_groups = get_user_groups(&**pool, user.id).await;
    let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

    // Traverse up (access check)
    let all_entries_ids = file_ids.iter().chain(folder_ids.iter()).copied().collect();

    let action_allowed_cascade_up = check_bulk_storage_entries_access_cascade_up(
        endpoint_id,
        &all_entries_ids,
        "download",
        user.id,
        &group_ids,
        &**pool,
    )
    .await;

    if !action_allowed_cascade_up {
        return error("storage.access_denied");
    }

    // Traverse down (access check)
    let mut file_filesystem_ids: Vec<String> = Vec::new();
    let mut folder_parents: HashMap<i64, Option<i64>> =
        folder_ids.iter().map(|id| (*id, None)).collect();

    let traverse_down_result = get_subfolders_level_with_access_rules(
        endpoint_id,
        &mut folder_parents,
        &mut file_filesystem_ids,
        folder_ids.clone(),
        (user.id, &group_ids),
        "download",
        &**pool,
    )
    .await;

    if traverse_down_result.is_err() {
        return error(traverse_down_result.unwrap_err().get_code());
    }

    // Access allowed, proceed to creating the zip archive

    // Based on the list of folder ids provided by the user, we need to find every
    // entry that exists somewhere inside of the requested folders
    let resolved_entries = resolve_entries(endpoint_id as i32, folder_ids, file_ids, &**pool).await;

    match resolved_entries {
        Ok(resolved_entries) => {
            // Increment downloads count for each file that will be included in the zip archive
            let filesystem_ids = resolved_entries
                .iter()
                .map(|(_, filesystem_id)| filesystem_id.as_str())
                .collect::<Vec<&str>>();

            // TODO don't block
            sqlx::query(
                "UPDATE storage_entries SET downloads_count = downloads_count + 1 WHERE filesystem_id = ANY($1) AND endpoint_id = $2",
            )
            .bind(filesystem_ids)
            .bind(endpoint_id)
            .execute(&**pool)
            .await
            .unwrap();

            let file_uuid = uuid::Uuid::new_v4().to_string();

            let zip_staging_path = Path::new("upload_staging").join(&file_uuid);
            let zip_file = File::create(&zip_staging_path).unwrap();

            let mut zip = ZipWriter::new(zip_file);

            let zip_options = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            // For each file that we have found
            for (file_path_str, file_filesystem_id) in resolved_entries.iter() {
                let file_path =
                    Path::new(target_endpoint_base_path.as_str()).join(file_filesystem_id);
                let mut file = File::open(file_path).unwrap();
                let mut chunk = [0; WRITE_FILE_CHUNK_SIZE];

                // Add that file to the zip archive (with a correct relative path)
                let start_file_result = zip.start_file(file_path_str, zip_options);

                if start_file_result.is_err() {
                    return error("storage.internal");
                }

                // And write the actual file's contents to the zip archive in chunks
                loop {
                    let bytes_read = file.read(&mut chunk[..]).unwrap();

                    if bytes_read == 0 {
                        break;
                    }

                    zip.write_all(&chunk[..bytes_read]).unwrap();
                }
            }

            zip.finish().unwrap();

            sqlx::query(
                "INSERT INTO storage_archives (endpoint_id, filesystem_id) VALUES ($1, $2)",
            )
            .bind(endpoint_id)
            .bind(&file_uuid)
            .execute(&**pool)
            .await
            .unwrap();

            let download_file = actix_files::NamedFile::open_async(&zip_staging_path)
                .await
                .unwrap()
                .set_content_disposition(ContentDisposition {
                    disposition: DispositionType::Attachment,
                    parameters: vec![DispositionParam::Filename("download.zip".to_string())],
                });

            return download_file.into_response(&req);
        }

        Err(_) => {
            return error("storage.internal");
        }
    }
}
