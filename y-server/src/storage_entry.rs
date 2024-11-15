use std::fs;
use std::{
    collections::HashMap, env, fs::remove_file, path::Path, process::Command, time::Instant,
};

use async_recursion::async_recursion;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    storage_access::{process_storage_entry, ProccessEntryRuleInput, StorageAccessType},
    storage_endpoint::get_storage_endpoint,
    util::RequestPool,
};
use log::*;

#[allow(dead_code)]
#[derive(PartialEq)]
pub enum StorageError {
    AccessDenied,

    NameConflict,
    RecursionError,
    EndpointNotFound,
    EndpointArtifactsDisabled,

    ConvertError,

    Internal,
}

impl StorageError {
    pub fn get_code(&self) -> &'static str {
        match self {
            StorageError::AccessDenied => "storage.access_denied",

            StorageError::NameConflict => "storage.name_conflict",
            StorageError::RecursionError => "storage.recursion_error",
            StorageError::EndpointNotFound => "storage.endpoint_not_found",
            StorageError::EndpointArtifactsDisabled => "storage.endpoint_artifacts_disabled",

            StorageError::ConvertError => "storage.convert_error",

            StorageError::Internal => "storage.internal",
        }
    }
}

#[derive(Serialize, Deserialize, PartialEq)]
pub enum StorageEntryType {
    #[serde(rename = "file")]
    File,
    #[serde(rename = "folder")]
    Folder,
}

#[derive(FromRow, Serialize)]
pub struct StorageFolder {
    pub id: i64,
    pub endpoint_id: i32,
    pub parent_folder: i64,
    pub name: String,
}

#[derive(FromRow, Debug)]
struct PartialStorageFileRow {
    filesystem_id: String,
    name: String,
    extension: Option<String>,
}

#[derive(FromRow)]
struct PartialStorageFolderRow {
    id: i64,
    name: String,
}

#[async_recursion]
async fn traverse_folder(
    endpoint_id: i32,
    resolved_entries: &mut HashMap<String, String>,
    target_folder_id: i64,
    current_path: &String,
    pool: &RequestPool,
) -> Result<(), StorageError> {
    // TODO these two requests can probably be combined into one

    // Find folders inside of the target folder
    let folder_subfolders = sqlx::query_as::<_, PartialStorageFolderRow>(
        "SELECT id, name FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = $2 AND storage_entries.entry_type = 'folder'::storage_entry_type",
    )
    .bind(endpoint_id)
    .bind(target_folder_id)
    .fetch_all(pool)
    .await;

    // Find files inside of the target folder
    let folder_files = sqlx::query_as::<_, PartialStorageFileRow>(
        "SELECT filesystem_id, name, extension FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = $2 AND storage_entries.entry_type = 'file'::storage_entry_type",
    )
    .bind(endpoint_id)
    .bind(target_folder_id)
    .fetch_all(pool)
    .await;

    match folder_files {
        Ok(folder_files) => {
            for file in folder_files {
                let file_base_path = if current_path.len() > 0 {
                    format!("{}/{}", current_path, file.name)
                } else {
                    file.name
                };

                let file_path = if file.extension.is_some() {
                    format!("{}.{}", file_base_path, file.extension.unwrap())
                } else {
                    file_base_path
                };

                resolved_entries.insert(file_path, file.filesystem_id);
            }
        }

        Err(_) => {
            return Err(StorageError::Internal);
        }
    }

    match folder_subfolders {
        Ok(subfolders) => {
            for folder in subfolders {
                let folder_path = if current_path.len() > 0 {
                    format!("{}/{}", current_path, folder.name)
                } else {
                    folder.name
                };

                let result =
                    traverse_folder(endpoint_id, resolved_entries, folder.id, &folder_path, pool)
                        .await;

                if result.is_err() {
                    return Err(result.unwrap_err());
                }
            }

            Ok(())
        }
        Err(_) => Err(StorageError::Internal),
    }
}

#[async_recursion]
async fn get_subfolders_level(
    endpoint_id: i32,
    folder_ids: &mut Vec<i64>,
    filesystem_ids: &mut Vec<String>,
    target_folder_ids: Vec<i64>,
    pool: &RequestPool,
) -> Result<(), StorageError> {
    #[derive(FromRow)]
    struct EntryRow {
        id: i64,
        filesystem_id: Option<String>,
    }

    let next_level_entries = sqlx::query_as::<_, EntryRow>(
        "SELECT id, filesystem_id FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2)",
    )
    .bind(endpoint_id)
    .bind(target_folder_ids)
    .fetch_all(pool)
    .await;

    match &next_level_entries {
        Ok(next_level_entries) => {
            let mut next_level_folder_ids: Vec<i64> = Vec::new();

            for entry in next_level_entries {
                if entry.filesystem_id.is_some() {
                    // File
                    filesystem_ids.push(entry.filesystem_id.clone().unwrap());
                } else {
                    // Folder
                    next_level_folder_ids.push(entry.id);
                    folder_ids.push(entry.id);
                }
            }

            if next_level_folder_ids.len() > 0 {
                let next_iteration = get_subfolders_level(
                    endpoint_id,
                    folder_ids,
                    filesystem_ids,
                    next_level_folder_ids,
                    pool,
                )
                .await;

                if next_iteration.is_err() {
                    return Err(next_iteration.unwrap_err());
                }
            }

            return Ok(());
        }
        Err(_) => {
            return Err(StorageError::Internal);
        }
    }
}

#[async_recursion]
pub async fn get_subfolders_level_with_access_rules(
    endpoint_id: i32,
    folder_parents: &mut HashMap<i64, Option<i64>>,
    filesystem_ids: &mut Vec<String>,
    folder_ids: Vec<i64>,
    access: (i32, &Vec<i32>),
    access_action: &str,
    pool: &RequestPool,
) -> Result<(), StorageError> {
    let (access_user_id, access_user_group_ids) = access;

    let next_level_entries =
        sqlx::query_as::<_, ProccessEntryRuleInput>(
            "SELECT 2 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, filesystem_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM storage_entries

            LEFT JOIN storage_access
            ON storage_access.entry_id = storage_entries.id
            AND storage_access.endpoint_id = storage_entries.endpoint_id
            AND storage_access.action = $4::storage_access_action_type
            AND storage_access.access_type != 'inherit'::storage_access_type
            AND (
                (storage_access.executor_type = 'user_group'::storage_access_executor_type
                AND storage_access.executor_id = ANY($3))
                OR
                (storage_access.executor_type = 'user'::storage_access_executor_type
                AND storage_access.executor_id = $5)
            )

            WHERE storage_entries.endpoint_id = $1
            AND storage_entries.parent_folder = ANY($2)

            UNION ALL

            SELECT 1 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, filesystem_id, storage_entries.parent_folder, storage_access_template_rules.access_type::TEXT, storage_access_template_rules.executor_type::TEXT, storage_access_template_rules.executor_id FROM storage_entries

            LEFT JOIN storage_access_template_entries
            ON storage_access_template_entries.entry_id = storage_entries.id
            AND storage_access_template_entries.entry_endpoint_id = storage_entries.endpoint_id

            LEFT JOIN storage_access_template_rules
            ON storage_access_template_entries.template_id = storage_access_template_rules.template_id
            AND storage_access_template_rules.action = $4::storage_access_action_type
            AND storage_access_template_rules.access_type != 'inherit'::storage_access_type
            AND (
                (storage_access_template_rules.executor_type = 'user_group'::storage_access_executor_type
                AND storage_access_template_rules.executor_id = ANY($3))
                OR
                (storage_access_template_rules.executor_type = 'user'::storage_access_executor_type
                AND storage_access_template_rules.executor_id = $5)
            )

            WHERE storage_entries.endpoint_id = $1
            AND storage_entries.parent_folder = ANY($2)

            ORDER BY entry_id ASC, rule_source DESC"
        )
        .bind(endpoint_id)
        .bind(&folder_ids)
        .bind(access_user_group_ids)
        .bind(access_action)
        .bind(access_user_id)
        .fetch_all(pool)
        .await;

    match &next_level_entries {
        Ok(next_level_entries) => {
            if next_level_entries.len() > 0 {
                let mut next_level_folder_ids: Vec<i64> = Vec::new();

                let mut last_entry_id = next_level_entries[0].entry_id;
                let mut start_i = 0;

                // Break up the rows from the database into slices. Each slice contains rules for one entry.
                for i in 0..next_level_entries.len() {
                    let _rule = &next_level_entries[i];

                    if _rule.entry_id != last_entry_id || i == next_level_entries.len() - 1 {
                        let end_i = if i == next_level_entries.len() - 1 {
                            i + 1
                        } else {
                            i
                        };

                        // _rule is NOT the entry we are currenly processing! It's the next one! Hence the _ prefix
                        let target_entry = &next_level_entries[start_i];

                        let (result_groups, result_user) =
                            process_storage_entry(&next_level_entries[start_i..end_i]);

                        if result_user.0 == StorageAccessType::Deny
                            || (!result_groups.is_empty()
                                && result_groups
                                    .values()
                                    .all(|x| x.0 == StorageAccessType::Deny))
                        {
                            return Err(StorageError::AccessDenied);
                        }

                        if target_entry.filesystem_id.is_some() {
                            // File
                            filesystem_ids.push(target_entry.filesystem_id.clone().unwrap());
                        } else {
                            // Folder
                            next_level_folder_ids.push(target_entry.entry_id);
                            folder_parents
                                .insert(target_entry.entry_id, target_entry.parent_folder);
                        }

                        start_i = i;
                    }

                    last_entry_id = _rule.entry_id;
                }

                let next_iteration = get_subfolders_level_with_access_rules(
                    endpoint_id,
                    folder_parents,
                    filesystem_ids,
                    next_level_folder_ids,
                    access,
                    access_action,
                    pool,
                )
                .await;

                if next_iteration.is_err() {
                    return next_iteration;
                }
            }

            return Ok(());
        }
        Err(_) => {
            return Err(StorageError::Internal);
        }
    }
}
/**
 * Recursively find all enties that reside somewhere inside of the target folders
 *
 * @param endpoint_id - Storage endpoint id
 * @param target_folders - Vector of folder ids to be resolved (can be empty)
 * @param target_files - Vector of file ids to be resolved (can be empty)
 * @param pool - Database connection pool
 *
 * @returns HashMap<String, String> - HashMap of resolved entries,
 * where the key is the relative path to the storage entry and the
 * value is the filesystem_id
 */
pub async fn resolve_entries(
    endpoint_id: i32,
    target_folders: Vec<i64>,
    target_files: Vec<i64>,
    pool: &RequestPool,
) -> Result<HashMap<String, String>, StorageError> {
    let current_path = String::new();
    let mut resolved_entries: HashMap<String, String> = HashMap::new();

    // Process folders
    if target_folders.len() > 0 {
        for target_folder_id in target_folders {
            let result = traverse_folder(
                endpoint_id,
                &mut resolved_entries,
                target_folder_id,
                &current_path,
                pool,
            )
            .await;

            if result.is_err() {
                return Err(result.unwrap_err());
            }
        }
    }

    // Proccess files
    if target_files.len() > 0 {
        let files = sqlx::query_as::<_, PartialStorageFileRow>(
            "SELECT filesystem_id, name, extension FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2) AND storage_entries.entry_type = 'file'::storage_entry_type",
        )
        .bind(endpoint_id)
        .bind(target_files)
        .fetch_all(pool)
        .await;

        match files {
            Ok(files) => {
                for file in files {
                    let file_name = if file.extension.is_some() {
                        format!("{}.{}", file.name, file.extension.unwrap())
                    } else {
                        file.name
                    };

                    resolved_entries.insert(file_name, file.filesystem_id);
                }
            }

            Err(_) => {
                return Err(StorageError::Internal);
            }
        }
    }

    Ok(resolved_entries)
}

/**
 * Recursively delete files and folders
 *
 * @param endpoint_id - Storage endpoint id
 * @param target_folders - Vector of folder ids to be deleted (can be empty)
 * @param target_files - Vector of file ids to be deleted (can be empty)
 * @param access - Tuple of user id and user group ids that will be used to check access rules
 * @param pool - Database connection pool
 *
 * @returns (usize, usize) - (total number of deleted files, total number of deleted folders)
 */
pub async fn delete_entries(
    endpoint_id: i32,
    target_folders: Vec<i64>,
    target_files: Vec<i64>,

    access: Option<(i32, &Vec<i32>)>,

    pool: &RequestPool,
) -> Result<(usize, usize), StorageError> {
    let now = Instant::now();

    // Find the endpoint so we know where the files we find will be stored physically
    let target_endpoint = get_storage_endpoint(endpoint_id, pool).await;

    if target_endpoint.is_err() {
        return Err(StorageError::EndpointNotFound);
    }

    let target_endpoint = target_endpoint.unwrap();

    // HashMap of folders to their parent folder id
    // pre-populate it with the target folders. We set the parent to None (as if they are inside the endpoint's root folder)
    // because we do not care about anything above the target folders. We just pretend that they reside inside the root
    let mut folder_parents: HashMap<i64, Option<i64>> =
        target_folders.iter().map(|id| (*id, None)).collect();

    // Arrays of *all* the folders we will find after the recursive search
    // These may be the arbitrarily deep inside the target folders
    let mut all_folders: Vec<i64> = Vec::new();

    // We will store the filesystem ids of all the files we are about to delete
    // We need to know the filesystem ids to actually delete the files from
    // the filesystem after we delete them from the database
    let mut file_filesystem_ids: Vec<String> = Vec::new();

    // Recursively find all the folders that reside inside target folders
    if folder_parents.len() > 0 {
        if let Some(access) = access {
            let get_subfolders_result = get_subfolders_level_with_access_rules(
                endpoint_id,
                &mut folder_parents,
                &mut file_filesystem_ids,
                target_folders,
                access,
                "delete",
                pool,
            )
            .await;

            if get_subfolders_result.is_err() {
                return Err(get_subfolders_result.unwrap_err());
            }

            all_folders = folder_parents.keys().map(|id| *id).collect();
        } else {
            all_folders = target_folders.clone();

            let get_subfolders_result = get_subfolders_level(
                endpoint_id,
                &mut all_folders,
                &mut file_filesystem_ids,
                target_folders,
                pool,
            )
            .await;

            if get_subfolders_result.is_err() {
                return Err(get_subfolders_result.unwrap_err());
            }
        }
    }

    // Delete the files from all of the folders we have found
    // At this point, we have travesed the storage tree and have found
    // all the entries that reside inside the target folders, on any level
    let transaction = pool.begin().await;

    if transaction.is_err() {
        return Err(StorageError::Internal);
    }

    let mut transaction = transaction.unwrap();

    // Delete files *inside* provided target folders (arbitrarily deep inside)
    if all_folders.len() > 0 {
        if access.is_some() {
            // If access is Some, then we have previosly called `get_subfolders_level_with_access_rules`
            // which already populated file_filesystem_ids vector with all the files that were found
            // inside folders

            let delete_folder_files_result = sqlx::query(
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2) AND entry_type = 'file'::storage_entry_type",
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .fetch_all(&mut *transaction)
            .await;

            if delete_folder_files_result.is_err() {
                return Err(StorageError::Internal);
            }
        } else {
            // if access is None, then we have previosly called `get_subfolders_level`, which
            // does not populate the file_filesystem_ids vector, so we need to do that here -
            // add each file which resides inside some folder

            let delete_folder_files_result = sqlx::query_scalar::<_, String>(
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2) AND entry_type = 'file'::storage_entry_type RETURNING filesystem_id",
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .fetch_all(&mut *transaction)
            .await;

            match delete_folder_files_result {
                Ok(delete_folder_files_result) => {
                    file_filesystem_ids.extend(delete_folder_files_result.into_iter());
                }
                Err(_) => {
                    return Err(StorageError::Internal);
                }
            }
        }
    }

    // Delete provided target files
    if target_files.len() > 0 {
        let delete_target_files_result = sqlx::query_scalar::<_, String>(
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2) RETURNING filesystem_id",
        )
        .bind(endpoint_id)
        .bind(target_files)
        .fetch_all(&mut *transaction)
        .await;

        if delete_target_files_result.is_err() {
            return Err(StorageError::Internal);
        }

        // Populate the vector with files that were explicitly selected for deletion (not the
        // ones that reside inside some selected folder - we do that earlier)
        file_filesystem_ids.extend(delete_target_files_result.unwrap());
    }

    // Delete provided target folders & their subfolders
    if all_folders.len() > 0 {
        let delete_folders_result =
            sqlx::query("DELETE FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2)")
                .bind(endpoint_id)
                .bind(&all_folders)
                .execute(&mut *transaction)
                .await;

        if delete_folders_result.is_err() {
            return Err(StorageError::Internal);
        }
    }

    if cfg!(debug_assertions) {
        info!(
            "delete_entries tree traversal & access checks: {}ms; {} files, {} folders",
            now.elapsed().as_millis(),
            file_filesystem_ids.len(),
            all_folders.len()
        );
    }

    let transaction_result = transaction.commit().await;

    if transaction_result.is_err() {
        return Err(StorageError::Internal);
    }

    // We have successfully deleted all the underlying files and folders from the database,
    // now we can actually delete the files from the filesystem
    let endpoint_base_path = target_endpoint.base_path;
    let endpoint_artifacts_path = target_endpoint.artifacts_path;
    let endpoint_files_path = Path::new(&endpoint_base_path);

    for file_filesystem_id in &file_filesystem_ids {
        let file_path = endpoint_files_path.join(file_filesystem_id);
        let fs_remove_result = remove_file(file_path);

        if fs_remove_result.is_err() {
            error!(
                "(storage entry -> delete entries) Could not remove a file from the filesystem. endpoint_id = {}. filesystem_id = {}. {}",
                endpoint_id,
                file_filesystem_id,
                fs_remove_result.unwrap_err()
            );
        }

        if let Some(endpoint_artifacts_path) = &endpoint_artifacts_path {
            let thumbnail_path = Path::new(&endpoint_artifacts_path)
                .join("thumbnails")
                .join(file_filesystem_id)
                .with_extension("webp");

            let frames_path = Path::new(&endpoint_artifacts_path)
                .join("thumbnails")
                .join(file_filesystem_id);

            let preview_video_path = Path::new(&endpoint_artifacts_path)
                .join("preview_videos")
                .join(file_filesystem_id)
                .with_extension("mp4");

            if thumbnail_path.exists() {
                let fs_remove_thumbnail_result = remove_file(thumbnail_path);

                if fs_remove_thumbnail_result.is_err() {
                    error!(
                        "(storage entry -> delete entries) Could not remove a thumbnail from the filesystem. endpoint_id = {}. filesystem_id = {}. {}",
                        endpoint_id,
                        file_filesystem_id,
                        fs_remove_thumbnail_result.unwrap_err()
                    );
                }
            }

            if frames_path.exists() {
                let fs_remove_frames_result = fs::remove_dir_all(frames_path);

                if fs_remove_frames_result.is_err() {
                    error!(
                        "(storage entry -> delete entries) Could not remove video frames folder from the filesystem. endpoint_id = {}. filesystem_id = {}. {}",
                        endpoint_id,
                        file_filesystem_id,
                        fs_remove_frames_result.unwrap_err()
                    );
                }
            }

            if preview_video_path.exists() {
                let fs_remove_preview_video_result = remove_file(preview_video_path);

                if fs_remove_preview_video_result.is_err() {
                    error!(
                        "(storage entry -> delete entries) Could not remove a preview video from the filesystem. endpoint_id = {}. filesystem_id = {}. {}",
                        endpoint_id,
                        file_filesystem_id,
                        fs_remove_preview_video_result.unwrap_err()
                    );
                }
            }
        }
    }

    return Ok((file_filesystem_ids.len(), all_folders.len()));
}

/**
 * Move enties to a new folder
 *
 * @param endpoint_id - Storage endpoint id
 * @param entry_ids - Entries to move
 * @param target_folder_id - Id of the folder where the entries will be moved to
 * @param pool - Database connection pool
*/
pub async fn move_entries(
    endpoint_id: i32,
    entry_ids: &Vec<i64>,
    target_folder_id: Option<i64>,
    pool: &RequestPool,
) -> Result<(), StorageError> {
    if entry_ids.len() == 0 {
        return Ok(());
    }

    let move_result = sqlx::query(
        "UPDATE storage_entries SET parent_folder = $1 WHERE id = ANY($2) AND endpoint_id = $3",
    )
    .bind(target_folder_id)
    .bind(entry_ids)
    .bind(endpoint_id)
    .execute(pool)
    .await;

    if let Err(move_error) = move_result {
        if let Some(database_error) = move_error.into_database_error() {
            if database_error.constraint() == Some("storage_entries_recursion_check") {
                return Err(StorageError::RecursionError);
            }
        }

        return Err(StorageError::NameConflict);
    }

    Ok(())
}

pub async fn rename_entry(
    endpoint_id: i32,
    entry_id: i64,
    new_name: &str,
    pool: &RequestPool,
) -> Result<Option<i64>, StorageError> {
    let rename_result =
        sqlx::query_scalar::<_, Option<i64>>("UPDATE storage_entries SET name = $1 WHERE id = $2 AND endpoint_id = $3 RETURNING parent_folder")
            .bind(new_name)
            .bind(entry_id)
            .bind(endpoint_id)
            .fetch_one(&*pool)
            .await;

    match rename_result {
        Ok(parent_folder) => Ok(parent_folder),
        Err(_) => Err(StorageError::NameConflict),
    }
}

pub fn generate_image_entry_thumbnail(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), StorageError> {
    let convert_bin_path = env::var("IMAGEMAGICK_BIN");

    if let Ok(convert_bin_path) = &convert_bin_path {
        let convert_bin_path = Path::new(&convert_bin_path);

        if convert_bin_path.exists() {
            let file_path = Path::new(endpoint_path).join(&filesystem_id);
            let endpoint_thumbnails_path = Path::new(endpoint_artifacts_path).join("thumbnails");

            let convert_result = Command::new(convert_bin_path)
                .arg("-quality")
                .arg("50")
                .arg("-resize")
                .arg("240x240")
                .arg("-define")
                .arg("webp:lossless=false")
                .arg(file_path.to_str().unwrap())
                .arg(
                    endpoint_thumbnails_path
                        .join(&filesystem_id)
                        .with_extension("webp")
                        .to_str()
                        .unwrap(),
                )
                .output();

            if let Ok(convert_result) = convert_result {
                if convert_result.status.success() {
                    Ok(())
                } else {
                    Err(StorageError::ConvertError)
                }
            } else {
                Err(StorageError::ConvertError)
            }
        } else {
            Err(StorageError::Internal)
        }
    } else {
        Ok(())
    }
}

pub fn generate_video_entry_thumbnails(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
    desired_frames_count: Option<u32>,
) -> Result<(), StorageError> {
    // TODO this function is exceptionally ugly

    let ffmpeg_bin_path = env::var("FFMPEG_BIN");

    if !ffmpeg_bin_path.is_ok() {
        return Ok(());
    }

    let ffmpeg_bin_path = ffmpeg_bin_path.unwrap();
    let ffmpeg_bin_path = Path::new(&ffmpeg_bin_path);

    if !ffmpeg_bin_path.exists() {
        return Err(StorageError::Internal);
    }

    let file_path = Path::new(endpoint_path).join(&filesystem_id);
    let endpoint_thumbnails_path = Path::new(endpoint_artifacts_path).join("thumbnails");
    let file_path_string = file_path.to_str().unwrap();

    let thumbnail_result = Command::new(ffmpeg_bin_path)
        .arg("-ss")
        .arg("00:00:01")
        .arg("-i")
        .arg(file_path.to_str().unwrap())
        .arg("-frames:v")
        .arg("1")
        .arg("-c:v")
        .arg("libwebp")
        .arg(
            endpoint_thumbnails_path
                .join(&filesystem_id)
                .with_extension("webp")
                .to_str()
                .unwrap(),
        )
        .output();

    if !thumbnail_result.is_ok() {
        return Err(StorageError::ConvertError);
    }

    if desired_frames_count.is_some() {
        let ffprobe_bin_path = env::var("FFPROBE_BIN");

        if !ffprobe_bin_path.is_ok() {
            return Ok(());
        }

        let ffprobe_bin_path = ffprobe_bin_path.unwrap();
        let ffprobe_bin_path = Path::new(&ffprobe_bin_path);

        if !ffprobe_bin_path.exists() {
            return Err(StorageError::Internal);
        }

        let frames_count_result = Command::new(ffprobe_bin_path)
            .arg("-v")
            .arg("error")
            .arg("-select_streams")
            .arg("v:0")
            .arg("-count_packets")
            .arg("-show_entries")
            .arg("stream=nb_read_packets")
            .arg("-of")
            .arg("csv=p=0")
            .arg(file_path_string)
            .output();

        if let Ok(frames_count_result) = frames_count_result {
            let frames_count_output = String::from_utf8(frames_count_result.stdout);

            if !frames_count_output.is_ok() {
                return Err(StorageError::ConvertError);
            }

            let frames_count = frames_count_output.unwrap().trim().parse::<u32>();

            if frames_count.is_err() {
                return Err(StorageError::ConvertError);
            }

            let frames_count = frames_count.unwrap();
            let desired_frames = desired_frames_count.unwrap();

            let frames_dir_path = &endpoint_thumbnails_path.join(&filesystem_id);
            fs::create_dir(frames_dir_path).unwrap();

            let frames_result = Command::new(ffmpeg_bin_path)
                .arg("-i")
                .arg(file_path_string)
                .arg("-vf")
                .arg(format!(
                    "select='not(mod(n, {}))",
                    frames_count / desired_frames
                ))
                .arg("-vsync")
                .arg("vfr")
                .arg("-c:v")
                .arg("libwebp")
                .arg(
                    frames_dir_path
                        .join("frame:%02d")
                        .with_extension("webp")
                        .to_str()
                        .unwrap(),
                )
                .output();

            if let Ok(ffmpeg_result) = frames_result {
                if ffmpeg_result.status.success() {
                    Ok(())
                } else {
                    Err(StorageError::ConvertError)
                }
            } else {
                Err(StorageError::ConvertError)
            }
        } else {
            return Err(StorageError::ConvertError);
        }
    } else {
        Ok(())
    }
}

pub fn generate_browser_friendly_video(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
    target_height: u32,
    target_bitrate: u32,
) -> Result<(), StorageError> {
    let ffmpeg_bin_path = env::var("FFMPEG_BIN");
    let ffmpeg_hwaccel_nvenc =
        env::var("FFMPEG_HWACCEL_NVENC").unwrap_or("false".to_string()) == "true";

    if let Ok(ffmpeg_bin_path) = &ffmpeg_bin_path {
        let ffmpeg_bin_path = Path::new(&ffmpeg_bin_path);

        if ffmpeg_bin_path.exists() {
            let file_path = Path::new(endpoint_path).join(&filesystem_id);
            let endpoint_preview_videos_path =
                Path::new(endpoint_artifacts_path).join("preview_videos");

            if !endpoint_preview_videos_path.exists() {
                let create_dir_result = std::fs::create_dir(&endpoint_preview_videos_path);

                if create_dir_result.is_err() {
                    return Err(StorageError::Internal);
                }
            }

            // TODO make the options configurable via the web interface!
            let ffmpeg_result = if ffmpeg_hwaccel_nvenc {
                Command::new(ffmpeg_bin_path)
                    .arg("-y")
                    .arg("-vsync")
                    .arg("0")
                    .arg("-hwaccel")
                    .arg("cuda")
                    .arg("-hwaccel_output_format")
                    .arg("cuda")
                    .arg("-i")
                    .arg(file_path.to_str().unwrap())
                    .arg("-c:v")
                    .arg("h264_nvenc")
                    .arg("-b:v")
                    .arg(format!("{}k", target_bitrate))
                    .arg("-b:a")
                    .arg("192k")
                    .arg("-vf")
                    .arg(format!("scale_cuda=-2:{}", target_height))
                    .arg(
                        endpoint_preview_videos_path
                            .join(&filesystem_id)
                            .with_extension("mp4")
                            .to_str()
                            .unwrap(),
                    )
                    .output()
            } else {
                Command::new(ffmpeg_bin_path)
                    .arg("-y")
                    .arg("-i")
                    .arg(file_path.to_str().unwrap())
                    .arg("-c:v")
                    .arg("libx264")
                    .arg("-b:v")
                    .arg(format!("{}k", target_bitrate))
                    .arg("-b:a")
                    .arg("192k")
                    .arg("-vf")
                    .arg(format!("scale=-2:{}", target_height))
                    .arg(
                        endpoint_preview_videos_path
                            .join(&filesystem_id)
                            .with_extension("mp4")
                            .to_str()
                            .unwrap(),
                    )
                    .output()
            };

            if let Ok(ffmpeg_result) = ffmpeg_result {
                if ffmpeg_result.status.success() {
                    Ok(())
                } else {
                    Err(StorageError::ConvertError)
                }
            } else {
                Err(StorageError::ConvertError)
            }
        } else {
            Err(StorageError::Internal)
        }
    } else {
        Ok(())
    }
}

pub fn generate_audio_entry_cover_thumbnail(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), StorageError> {
    let ffmpeg_bin_path = env::var("FFMPEG_BIN");

    if let Ok(ffmpeg_bin_path) = &ffmpeg_bin_path {
        let ffmpeg_bin_path = Path::new(&ffmpeg_bin_path);

        if ffmpeg_bin_path.exists() {
            let file_path = Path::new(endpoint_path).join(&filesystem_id);
            let endpoint_thumbnails_path = Path::new(endpoint_artifacts_path).join("thumbnails");

            let ffmpeg_result = Command::new(ffmpeg_bin_path)
                .arg("-i")
                .arg(file_path.to_str().unwrap())
                .arg("-an")
                .arg("-c:v")
                .arg("libwebp")
                .arg(
                    endpoint_thumbnails_path
                        .join(&filesystem_id)
                        .with_extension("webp")
                        .to_str()
                        .unwrap(),
                )
                .output();

            if let Ok(ffmpeg_result) = ffmpeg_result {
                if ffmpeg_result.status.success() {
                    Ok(())
                } else {
                    Err(StorageError::ConvertError)
                }
            } else {
                Err(StorageError::ConvertError)
            }
        } else {
            Err(StorageError::Internal)
        }
    } else {
        Ok(())
    }
}
