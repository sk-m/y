use futures::executor::block_on;
use log::*;
use std::fs;
use std::sync::Mutex;
use std::{collections::HashMap, fs::OpenOptions, path::Path};
use uuid::Uuid;

use actix_multipart::Multipart;
use actix_web::{
    post,
    web::{self, Query},
    HttpResponse, Responder,
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::time::Instant;

use crate::config::get_config;
use crate::storage_access::{check_endpoint_root_access, check_storage_entry_access};
use crate::storage_entry::{
    generate_audio_entry_cover_thumbnail, generate_browser_friendly_video,
    generate_image_entry_thumbnail, generate_video_entry_thumbnails,
};
use crate::user::{get_group_rights, get_user_from_request, get_user_groups};
use crate::ws::WSState;
use crate::{storage_endpoint::get_storage_endpoint, util::RequestPool};

const MAX_FILE_SIZE_FOR_THUMNAIL_GENERATION: u64 = 50_000_000;

// Actix Multipart does not like us returning from a handler early, before the whole `Multipart` stream is consumed.
// If we do that, the connection will be dropped and the server will panic. We definitely do not want that to happen...
// So, we need to sink the whole stream and only then return an error response.
async fn sink_and_error(error_code: &str, payload: &mut Multipart) -> HttpResponse {
    use crate::request;

    payload
        .map(Ok)
        .forward(futures::sink::drain())
        .await
        .unwrap();

    request::error(error_code)
}

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
    ws_state: web::Data<Mutex<WSState>>,
    query: Query<QueryParams>,
    mut payload: Multipart,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let now = Instant::now();
    let mut uploaded_files: Vec<String> = Vec::new();

    let target_folder_id = query.target_folder;
    let endpoint_id = query.endpoint_id;

    // Check the rights
    let client = get_user_from_request(&pool, &req).await;

    let client_user_id = if client.is_some() {
        let client_user = &client.as_ref().unwrap().0;

        Some(client_user.id)
    } else {
        None
    };

    let action_allowed;

    // TODO @cleanup
    if let Some(target_folder_id) = target_folder_id {
        action_allowed = if let Some((client_user, _)) = client {
            let user_groups = get_user_groups(&**pool, client_user.id).await;
            let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

            check_storage_entry_access(
                endpoint_id,
                target_folder_id,
                "upload",
                client_user.id,
                &group_ids,
                &**pool,
            )
            .await
        } else {
            false
        };
    } else {
        // folder_id == NULL means the root level of the endpoint

        action_allowed = if let Some(client_user_id) = client_user_id {
            let user_groups = get_user_groups(&**pool, client_user_id).await;
            let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

            let group_rights = get_group_rights(&pool, &group_ids).await;

            check_endpoint_root_access(endpoint_id, group_rights)
        } else {
            false
        }
    }

    if !action_allowed {
        return sink_and_error("storage.access_denied", &mut payload).await;
    }

    // Get the target endpoint's base path, so we know where to save the files
    // TODO: Cache all endpoints so we dont' have to query for them every time

    let target_endpoint = get_storage_endpoint(endpoint_id, &pool).await;

    if target_endpoint.is_err() {
        return sink_and_error("storage.endpoint_not_found", &mut payload).await;
    }

    let target_endpoint = target_endpoint.unwrap();

    if target_endpoint.status != "active" {
        return sink_and_error("storage.endpoint_not_active", &mut payload).await;
    }

    let target_endpoint_base_path = Path::new(&target_endpoint.base_path);

    let mut path_ids_cache: HashMap<String, i64> = HashMap::new();
    let mut skipped_files = Vec::<String>::new();

    // Go through each entry in the multipart request.
    // Each entry is a file.
    while let Some(item) = payload.next().await {
        if let Ok(mut field) = item {
            let file_relative_path = field.content_disposition().get_filename().clone();
            let full_filename = field.name().to_string();

            if let Some(file_relative_path) = file_relative_path {
                let file_filesystem_id = Uuid::new_v4().to_string();
                let mut file_relative_path = String::from(file_relative_path);

                let name_separator = full_filename.rfind('.').unwrap_or(full_filename.len());

                let (file_name, file_extension) = full_filename.split_at(name_separator);

                let file_extension = if file_extension.len() > 0 {
                    Some(file_extension.trim_start_matches('.'))
                } else {
                    None
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
                let mut parent_folder_id = target_folder_id.clone();

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

                        Some(cached_path_id.unwrap().clone())
                    } else {
                        let file_relative_path_segments = file_relative_path.split("/");

                        let mut folder_id = target_folder_id.clone();

                        let mut path_so_far: Vec<&str> = Vec::new();

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
                                    "SELECT id FROM storage_entries WHERE endpoint_id = $1 AND name = $2 AND parent_folder = $3 AND entry_type = 'folder'::storage_entry_type",
                                    )
                                    .bind(endpoint_id)
                                    .bind(path_segment)
                                    .bind(folder_id)
                                    .fetch_one(&**pool)
                                    .await
                                } else {
                                    sqlx::query_scalar::<_, i64>(
                                    "SELECT id FROM storage_entries WHERE endpoint_id = $1 AND name = $2 AND parent_folder IS NULL AND entry_type = 'folder'::storage_entry_type",
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

                                    let create_folder_result = sqlx::query_scalar::<_, i64>("INSERT INTO storage_entries (endpoint_id, parent_folder, name, entry_type) VALUES ($1, $2, $3, 'folder'::storage_entry_type) RETURNING id")
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
                                            return sink_and_error(
                                                "storage.internal",
                                                &mut payload,
                                            )
                                            .await;
                                        }
                                    }
                                }
                            }
                        }

                        folder_id
                    };
                }

                // Now that we have determined what the `parent_folder` for this file should be,
                // let's actually write it onto the filesystem and create a new row in the databse for it.

                // 1. Write the file onto the filesystem
                let path = target_endpoint_base_path.join(&file_filesystem_id);
                let file = OpenOptions::new().write(true).create_new(true).open(&path);

                if let Ok(mut file) = file {
                    let mut file_kind: Option<infer::Type> = None;
                    let mut file_size_bytes: i64 = 0;

                    let mut first_chunk = true;

                    while let Some(chunk) = field.next().await {
                        // TODO maybe instead of failing the whole request just because of a
                        // single chunk error, we should just rollback the transaction and
                        // continue on to the next file in the request?
                        if let Ok(chunk) = chunk {
                            // TODO don't branch in this loop. Just get the first chunk before the loop.
                            if first_chunk {
                                first_chunk = false;
                                file_kind = infer::get(&chunk);
                            }

                            file_size_bytes += chunk.len() as i64;
                            let res = file.write(&chunk);

                            if res.is_err() {
                                fs::remove_file(&path).unwrap_or(());

                                return sink_and_error("storage.internal", &mut payload).await;
                            }
                        } else {
                            fs::remove_file(&path).unwrap_or(());

                            return sink_and_error("storage.internal", &mut payload).await;
                        }
                    }

                    // 2. Create a new row in the database
                    let file_mime_type = if file_kind.is_some() {
                        Some(file_kind.unwrap().mime_type())
                    } else {
                        None
                    };

                    let create_file_result = sqlx::query("INSERT INTO storage_entries (endpoint_id, filesystem_id, parent_folder, name, extension, mime_type, size_bytes, created_by, created_at, entry_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), 'file'::storage_entry_type)")
                    .bind(endpoint_id)
                    .bind(&file_filesystem_id)
                    .bind(parent_folder_id)
                    .bind(file_name)
                    .bind(file_extension)
                    .bind(file_mime_type)
                    .bind(file_size_bytes)
                    .bind(client_user_id)
                    .execute(&**pool).await;

                    if create_file_result.is_err() {
                        // The most likely scenario for an error here is that the
                        // file with the same filename in the same folder already exists.
                        // This is not critical, so we will just delete the file we just wrote and
                        // continue on to the next file in the request.

                        // TODO: it's kind of dumb to upload a file only to delete it later if it already exists...

                        skipped_files.push(full_filename);

                        warn!("{}", create_file_result.unwrap_err());

                        fs::remove_file(&path).unwrap_or(());
                    } else {
                        uploaded_files.push(file_filesystem_id.clone());
                    }
                } else {
                    // For some reason, we could not write the file onto the filesystem.
                    // This is not critical, we can continue.

                    skipped_files.push(full_filename.clone());
                }
            } else {
                return sink_and_error("storage.upload.no_filename", &mut payload).await;
            }
        } else {
            return sink_and_error("storage.internal", &mut payload).await;
        }
    }

    if cfg!(debug_assertions) {
        info!("storage/upload: {}ms", now.elapsed().as_millis());
    }

    // TODO don't block the request
    let mut folders_to_update = path_ids_cache
        .values()
        .map(|v| Some(v.clone()))
        .collect::<Vec<Option<i64>>>();

    folders_to_update.push(target_folder_id);

    // TODO no.
    let ws_state2 = ws_state.clone();
    let folders_to_update2 = folders_to_update.clone();

    // Generate thumbnails
    std::thread::spawn(move || {
        let storage_config = block_on(get_config(&**pool));

        let generate_image_thumbnails =
            storage_config.get("storage.generate_thumbnails.image") == Some(&"true".to_string());

        let generate_video_thumbnails =
            storage_config.get("storage.generate_thumbnails.video") == Some(&"true".to_string());

        let generate_audio_thumbnails =
            storage_config.get("storage.generate_thumbnails.audio") == Some(&"true".to_string());

        let generate_seeking_thumbnails = storage_config
            .get("storage.generate_seeking_thumbnails.enabled")
            == Some(&"true".to_string());

        let seeking_thumbnails_frames_count = storage_config
            .get("storage.generate_seeking_thumbnails.desired_frames")
            .unwrap_or(&"10".to_string())
            .parse::<u32>()
            .unwrap_or(10);

        if let Some(target_endpoint_artifacts_path) = &target_endpoint.artifacts_path {
            for filesystem_id in &uploaded_files {
                let path = Path::new(&target_endpoint.base_path).join(&filesystem_id);

                let file_kind = infer::get_from_path(&path);

                if !file_kind.is_err() {
                    if let Some(file_kind) = file_kind.unwrap() {
                        let mime_type = file_kind.mime_type();

                        match mime_type {
                            "image/jpeg" | "image/png" | "image/gif" | "image/webp"
                            | "image/bmp" => {
                                if generate_image_thumbnails {
                                    let file_metadata =
                                        fs::File::open(&path).unwrap().metadata().unwrap();

                                    if file_metadata.len() <= MAX_FILE_SIZE_FOR_THUMNAIL_GENERATION
                                    {
                                        let generate_thumbnail_result =
                                            generate_image_entry_thumbnail(
                                                &filesystem_id,
                                                &target_endpoint.base_path.as_str(),
                                                &target_endpoint_artifacts_path.as_str(),
                                            );

                                        if generate_thumbnail_result.is_err() {
                                            error!(
                                            "Failed to create a thumbnail for an uploaded image file ({})",
                                            &filesystem_id
                                        );
                                        }
                                    }
                                }
                            }

                            "video/mp4" | "video/webm" | "video/mov" | "video/avi"
                            | "video/mpeg" | "video/quicktime" | "video/x-msvideo" => {
                                if generate_video_thumbnails {
                                    let generate_thumbnail_result = generate_video_entry_thumbnails(
                                        &filesystem_id,
                                        &target_endpoint.base_path.as_str(),
                                        &target_endpoint_artifacts_path.as_str(),
                                        if generate_seeking_thumbnails {
                                            Some(seeking_thumbnails_frames_count)
                                        } else {
                                            None
                                        },
                                    );

                                    if generate_thumbnail_result.is_err() {
                                        error!(
                                        "Failed to create a thumbnail for an uploaded video file ({})",
                                        &filesystem_id
                                    );
                                    }
                                }
                            }

                            "audio/mpeg" | "audio/x-flac" | "audio/x-wav" | "audio/aac" => {
                                if generate_audio_thumbnails {
                                    let generate_thumbnail_result =
                                        generate_audio_entry_cover_thumbnail(
                                            &filesystem_id,
                                            &target_endpoint.base_path.as_str(),
                                            &target_endpoint_artifacts_path.as_str(),
                                        );

                                    if generate_thumbnail_result.is_err() {
                                        error!(
                                            "Failed to create a cover image thumbnail for an uploaded audio file ({})",
                                            &filesystem_id
                                        );
                                    }
                                }
                            }

                            _ => {}
                        }
                    }
                }
            }

            let transcoding_enabled =
                storage_config.get("storage.transcode_videos.enabled") == Some(&"true".to_string());

            if transcoding_enabled {
                let target_height = storage_config
                    .get("storage.transcode_videos.target_height")
                    .unwrap_or(&"720".to_string())
                    .parse::<u32>()
                    .unwrap_or(720);

                let target_bitrate = storage_config
                    .get("storage.transcode_videos.target_bitrate")
                    .unwrap_or(&"4000".to_string())
                    .parse::<u32>()
                    .unwrap_or(4000);

                let mut files_to_transcode: Vec<String> = Vec::new();

                for filesystem_id in &uploaded_files {
                    let path = Path::new(&target_endpoint.base_path).join(&filesystem_id);

                    let file_kind = infer::get_from_path(&path);

                    if !file_kind.is_err() {
                        if let Some(file_kind) = file_kind.unwrap() {
                            let mime_type = file_kind.mime_type();

                            match mime_type {
                                "video/mp4" | "video/webm" | "video/mov" | "video/avi"
                                | "video/mpeg" | "video/quicktime" | "video/x-msvideo" => {
                                    files_to_transcode.push(filesystem_id.clone());
                                }

                                _ => {}
                            }
                        }
                    }
                }

                let _ = block_on(sqlx::query("UPDATE storage_entries SET transcoded_version_available = FALSE WHERE endpoint_id = $1 AND filesystem_id = ANY($2)")
                    .bind(endpoint_id)
                    .bind(&files_to_transcode)
                    .execute(&**pool));

                // Refresh folder when thumbnails are ready
                let _ = block_on(ws_state2.lock().unwrap().send_storage_location_updated(
                    None,
                    endpoint_id,
                    // TODO stop cloning stuff...
                    folders_to_update2.clone(),
                    if files_to_transcode.is_empty() {
                        false
                    } else {
                        true
                    },
                    true,
                ));

                for filesystem_id in &files_to_transcode {
                    let generate_preview_result = generate_browser_friendly_video(
                        &filesystem_id,
                        &target_endpoint.base_path.as_str(),
                        &target_endpoint_artifacts_path.as_str(),
                        target_height,
                        target_bitrate,
                    );

                    if generate_preview_result.is_ok() {
                        let parent_folder = block_on(sqlx::query_scalar::<_, Option<i64>>("UPDATE storage_entries SET transcoded_version_available = TRUE WHERE endpoint_id = $1 AND filesystem_id = $2 RETURNING parent_folder")
                            .bind(endpoint_id)
                            .bind(filesystem_id)
                            .fetch_one(&**pool));

                        if let Ok(parent_folder) = parent_folder {
                            // Refresh folder when a video is ready
                            let _ =
                                block_on(ws_state2.lock().unwrap().send_storage_location_updated(
                                    None,
                                    endpoint_id,
                                    vec![parent_folder],
                                    true,
                                    false,
                                ));
                        }
                    } else {
                        error!(
                            "Failed to create a browser friendly preview for an uploaded video file ({})",
                            &filesystem_id,
                        );
                    }
                }
            }
        }
    });

    // Refresh folder after successful upload
    // TODO don't block the request
    ws_state
        .lock()
        .unwrap()
        .send_storage_location_updated(client_user_id, endpoint_id, folders_to_update, true, false)
        .await;

    HttpResponse::Ok().json(web::Json(StorageUploadOutput { skipped_files }))
}
