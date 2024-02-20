use std::{collections::HashMap, fs::OpenOptions, ops::Deref, path::Path};

use actix_multipart::Multipart;
use actix_web::{
    post,
    web::{self, Query},
    HttpResponse, Responder,
};
use futures::StreamExt;
use log::*;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::time::Instant;

use crate::{
    request::error, storage_endpoint::get_storage_endpoint, user::get_client_rights,
    util::RequestPool,
};

#[derive(Serialize)]
struct StorageUploadOutput {
    skipped_files: Vec<String>,
}

#[derive(Deserialize)]
struct QueryParams {
    endpoint_id: i32,

    /**
     * The folder where the files will reside. `null` == root.
     */
    target_folder: Option<i64>,
}

#[post("/upload")]
async fn storage_upload(
    pool: web::Data<RequestPool>,
    query: Query<QueryParams>,
    mut payload: Multipart,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let now = Instant::now();

    // Check the rights
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("storage_upload"))
        .is_some();

    if !action_allowed {
        return error("storage.upload.unauthorized");
    }

    // Get the target endpoint's base path, so we know where to save the files
    // TODO: Cache all endpoints so we dont' have to query for them every time
    let endpoint_id = query.endpoint_id;

    let target_endpoint = get_storage_endpoint(endpoint_id, &pool).await;

    if target_endpoint.is_err() {
        return error("storage.upload.endpoint_not_found");
    }

    let target_endpoint = target_endpoint.unwrap();

    if target_endpoint.status != "active" {
        return error("storage.upload.endpoint_not_active");
    }

    let target_endpoint_base_path = Path::new(&target_endpoint.base_path);

    let target_folder_id = query.target_folder;

    let mut path_ids_cache: HashMap<String, i64> = HashMap::new();
    let mut skipped_files = Vec::<String>::new();

    // Go through each entry in the multipart request.
    // Each entry is a file.
    while let Some(item) = payload.next().await {
        if let Ok(mut field) = item {
            let file_relative_path = field.content_disposition().get_filename().clone();
            let file_filename = String::from(field.name());

            if let Some(file_relative_path) = file_relative_path {
                let file_id = uuid::Uuid::new_v4().to_string();

                let mut file_relative_path = String::from(file_relative_path);
                let mut file_filename_parts = file_filename.split(".").collect::<Vec<&str>>();

                // Extract the file's name and extension
                let file_extension = if file_filename_parts.len() == 0 {
                    None
                } else {
                    Some(file_filename_parts[file_filename_parts.len() - 1])
                };

                let file_name = if file_extension.is_none() {
                    file_filename.clone()
                } else {
                    file_filename_parts.pop();
                    file_filename_parts.join(".")
                };

                // Now we need to find the folder where the file will be uploaded to.
                //
                // We basically have two input parameters:
                // 1. `target_folder` query param - a folder where the user wants to
                //    upload all the files to.
                // 2. each files's relative path (stored in the file's `filename` field) -
                //    a path to the file, relative to the folder that the user is uploading.
                //
                // If a user is uploading files that are all on the same level, or, in
                // other words, without any folders, it's simple - we just get the
                // `target_folder` query param and set it as a `parent_folder` for each
                // uploaded file.
                //
                // But it's not always the case, as users are able to upload whole folders
                // from their device, and those folders can have an arbitrary number of
                // other folders inside of them, at any depth. So, in order to be able
                // to handle such requests correctly, we need to find a `parent_folder`
                // for each file separately.
                //
                // To do that, we take the file's `filename` field that holds the "desired"
                // relative path of that file, and for each segment of that path, we query
                // the database to find the actual folder id of that segment. If we can not find
                // an id of a segment, that means that that folder does not yet exist in our system,
                // so we create a new one and continue. Once we traverse the whole path, we
                // will know what the `parent_folder` of tha file in question needs to be -
                // it's the id of a folder which is the last segment of the file's relative path.

                // Id of the folder, to which the file's path (`filename`) is relative to.
                // This is `null` if the target destination of the whole upload is root, or an id,
                // if a user is uploading all the files into some (already existing) folder.
                let mut parent_folder_id: Option<i64> = target_folder_id.clone();

                if file_relative_path.len() != 0 {
                    // This file is not being uploaded to the relative root, it has a relative path!

                    // If the path ends with '/' (which can happen), everything after the slash
                    // will be treated as another path segment, even if it's a zero length string.
                    // A path segment can not be a zero length string, so we need to handle this edge case.
                    if file_relative_path.ends_with("/") {
                        file_relative_path.pop();
                    }

                    let cached_path_id = path_ids_cache.get(file_relative_path.as_str());

                    parent_folder_id = if cached_path_id.is_some() {
                        // We have tried to find such a target location before, and have cached our
                        // findings. No need to traverse the relative path again, just use the
                        // folder_id we've found before.

                        Some(cached_path_id.unwrap().deref().clone())
                    } else {
                        let file_relative_path_segments = file_relative_path.split("/");

                        let mut folder_id: Option<i64> = target_folder_id.clone();

                        let mut path_so_far = Vec::<&str>::new();

                        // As long as it's true, we'll try to query the database for each path
                        // segment in order to find that segment's actual folder id.
                        let mut try_to_find_each_folder = true;

                        for path_segment in file_relative_path_segments {
                            // A path segment can not be a zero length string
                            if path_segment.len() == 0 {
                                continue;
                            };

                            path_so_far.push(path_segment);

                            let mut find_folder_result: Result<i64, sqlx::Error> =
                                Err(sqlx::Error::RowNotFound);

                            if try_to_find_each_folder {
                                find_folder_result = if folder_id.is_some() {
                                    sqlx::query_scalar::<_, i64>(
                                    "SELECT id FROM storage_folders WHERE endpoint_id = $1 AND name = $2 AND parent_folder = $3",
                                    )
                                    .bind(endpoint_id)
                                    .bind(path_segment)
                                    .bind(folder_id)
                                    .fetch_one(&**pool)
                                    .await
                                } else {
                                    sqlx::query_scalar::<_, i64>(
                                    "SELECT id FROM storage_folders WHERE endpoint_id = $1 AND name = $2 AND parent_folder IS NULL",
                                    )
                                    .bind(endpoint_id)
                                    .bind(path_segment)
                                    .fetch_one(&**pool)
                                    .await
                                };
                            }

                            match find_folder_result {
                                Ok(id) => {
                                    folder_id = Some(id);

                                    let path_to_cache = path_so_far.join("/");
                                    path_ids_cache.insert(path_to_cache, id);
                                }
                                Err(_) => {
                                    // We were not able to find a folder for a path segment in question.
                                    // This means that the file's path does not yet exist in our system.
                                    // Because of that, we are positive that each following path segment
                                    // (folder) will also be absent, so we'll skip serches for
                                    // all the following segmens and will jump straight into their creation.
                                    try_to_find_each_folder = false;

                                    let create_folder_result = sqlx::query_scalar::<_, i64>("INSERT INTO storage_folders (endpoint_id, parent_folder, name) VALUES ($1, $2, $3) RETURNING id")
                                    .bind(endpoint_id)
                                    .bind(folder_id)
                                    .bind(path_segment)
                                    .fetch_one(&**pool).await;

                                    match create_folder_result {
                                        Ok(id) => {
                                            folder_id = Some(id);

                                            let path_to_cache = path_so_far.join("/");
                                            path_ids_cache.insert(path_to_cache, id);
                                        }
                                        Err(_) => {
                                            return error("storage.upload.internal");
                                        }
                                    }
                                }
                            }
                        }

                        folder_id
                    };
                }

                // Now that we have determined what the `parent_folder` for this file should be,
                // let's create a new row for it and actually upload it onto the filesystem.
                let file_transaction = pool.begin().await;

                if let Ok(mut file_transaction) = file_transaction {
                    // Create a new file row
                    let create_file_result = sqlx::query("INSERT INTO storage_files (endpoint_id, filesystem_id, parent_folder, name, extension) VALUES ($1, $2, $3, $4, $5)")
                        .bind(endpoint_id)
                        .bind(file_id.clone())
                        .bind(parent_folder_id)
                        .bind(file_name)
                        .bind(file_extension)
                        .execute(&mut *file_transaction).await;

                    if create_file_result.is_err() {
                        // The most likely scenario for an error here is that the
                        // file with the same filename in the same folder already exists.
                        // This is not critical, so we will just rollback the transaction and
                        // continue on to the next file in the request.

                        skipped_files.push(file_filename);

                        let rollback_result = file_transaction.rollback().await;

                        if rollback_result.is_err() {
                            return error("storage.upload.internal");
                        }
                    } else {
                        // We created a row in the database, now let's actually write the
                        // file onto the filesystem
                        let path = target_endpoint_base_path.join(file_id);
                        let file = OpenOptions::new().write(true).create_new(true).open(path);

                        if let Ok(mut file) = file {
                            while let Some(chunk) = field.next().await {
                                // TODO maybe instead of failing the whole request just because of a
                                // single chunk error, we should just rollback the transaction and
                                // continue on to the next file in the request?
                                if let Ok(chunk) = chunk {
                                    let res = file.write(&chunk);

                                    if res.is_err() {
                                        return error("storage.upload.internal");
                                    }
                                } else {
                                    return error("storage.upload.internal");
                                }
                            }

                            let commit_result = file_transaction.commit().await;

                            if commit_result.is_err() {
                                return error("storage.upload.internal");
                            }
                        } else {
                            // For some reason, we could not write the file onto the filesystem.
                            // This is not critical, so we will just rollback the transaction
                            // for the current file and continue on.

                            skipped_files.push(file_filename);

                            let rollback_result = file_transaction.rollback().await;

                            if rollback_result.is_err() {
                                return error("storage.upload.internal");
                            }
                        }
                    }
                } else {
                    return error("storage.upload.internal");
                }
            } else {
                return error("storage.upload.no_filename");
            }
        } else {
            return error("storage.upload.internal");
        }
    }

    if cfg!(debug_assertions) {
        info!("storage/upload: {}ms", now.elapsed().as_millis());
    }

    HttpResponse::Ok().json(web::Json(StorageUploadOutput { skipped_files }))
}
