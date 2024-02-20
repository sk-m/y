use std::path::Path;

use crate::request::error;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::{post, web, Responder};
use serde::Deserialize;

use std::fs::File;
use std::io::{Read, Write};
use zip::ZipWriter;

use crate::storage_entry::resolve_entries;
use crate::user::get_client_rights;
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
    path: web::Path<i64>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    // TODO: We should probably add a separate right for downloading zipped entries
    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_download"))
        .is_some();

    if !action_allowed {
        return error("storage.download_zip.unauthorized");
    }

    let form = form.into_inner();

    // Get the target endpoint's base path, so we know where to save the files
    // TODO: Cache all endpoints so we don't have to query for them every time
    let endpoint_id = path.into_inner();

    let target_endpoint =
        sqlx::query_scalar::<_, String>("SELECT base_path FROM storage_endpoints WHERE id = $1")
            .bind(endpoint_id)
            .fetch_one(&**pool)
            .await;

    if target_endpoint.is_err() {
        return error("storage.download_zip.endpoint_not_found");
    }

    let target_endpoint_base_path = target_endpoint.unwrap();
    let target_endpoint_base_path = Path::new(&target_endpoint_base_path);

    let file_ids = form.file_ids;
    let folder_ids = form.folder_ids;

    // Based on the list of folder ids provided by the user, we need to find every
    // entry that exists somewhere inside of the requested folders
    let resolved_entries = resolve_entries(endpoint_id as i32, folder_ids, file_ids, &**pool).await;

    match resolved_entries {
        Ok(resolved_entries) => {
            let file_uuid = uuid::Uuid::new_v4().to_string();

            let zip_staging_path = Path::new("upload_staging").join(&file_uuid);
            let zip_file = File::create(&zip_staging_path).unwrap();

            let mut zip = ZipWriter::new(zip_file);

            let zip_options = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            // For each file that we have found
            for (file_path_str, file_filesystem_id) in resolved_entries.iter() {
                let file_path = Path::new(target_endpoint_base_path).join(file_filesystem_id);
                let mut file = File::open(file_path).unwrap();
                let mut chunk = [0; WRITE_FILE_CHUNK_SIZE];

                // Add that file to the zip archive (with a correct relative path)
                let start_file_result = zip.start_file(file_path_str, zip_options);

                if start_file_result.is_err() {
                    return error("storage.download_zip.internal");
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
            return error("storage.download_zip.internal");
        }
    }
}
