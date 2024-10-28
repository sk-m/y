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
) -> Result<(), sqlx::Error> {
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

        Err(err) => {
            return Err(err);
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
        Err(err) => Err(err),
    }
}

#[async_recursion]
async fn get_subfolders_level(
    endpoint_id: i32,
    all_folders: &mut Vec<i64>,
    folder_ids: Vec<i64>,
    pool: &RequestPool,
) -> Result<(), String> {
    #[derive(FromRow)]
    struct StorageFolderIdRow {
        id: i64,
    }

    let next_level_folders = sqlx::query_as::<_, StorageFolderIdRow>(
        "SELECT id FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2) AND storage_entries.entry_type = 'folder'::storage_entry_type",
    )
    .bind(endpoint_id)
    .bind(folder_ids)
    .fetch_all(pool)
    .await;

    match &next_level_folders {
        Ok(next_level_folders) => {
            let mut next_level_folder_ids: Vec<i64> = Vec::new();

            for folder in next_level_folders {
                next_level_folder_ids.push(folder.id);
                all_folders.push(folder.id);
            }

            if next_level_folder_ids.len() > 0 {
                get_subfolders_level(endpoint_id, all_folders, next_level_folder_ids, pool).await?;
            }

            return Ok(());
        }
        Err(_) => {
            return Err("Could not query the database for the next level of folders".to_string());
        }
    }
}

#[async_recursion]
async fn get_subfolders_level_with_access_rules(
    endpoint_id: i32,
    folder_parents: &mut HashMap<i64, Option<i64>>,
    folder_ids: Vec<i64>,
    access: (i32, &Vec<i32>),
    access_action: &str,
    pool: &RequestPool,
) -> Result<(), String> {
    let (access_user_id, access_user_group_ids) = access;

    let next_level_folders =
        sqlx::query_as::<_, ProccessEntryRuleInput>(
            "SELECT 2 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, NULL AS filesystem_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM storage_entries

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
            AND storage_entries.entry_type = 'folder'::storage_entry_type

            UNION ALL

            SELECT 1 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, NULL AS filesystem_id, storage_entries.parent_folder, storage_access_template_rules.access_type::TEXT, storage_access_template_rules.executor_type::TEXT, storage_access_template_rules.executor_id FROM storage_entries

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
            AND storage_entries.entry_type = 'folder'::storage_entry_type

            ORDER BY entry_id ASC, rule_source DESC"
        )
        .bind(endpoint_id)
        .bind(&folder_ids)
        .bind(access_user_group_ids)
        .bind(access_action)
        .bind(access_user_id)
        .fetch_all(pool)
        .await;

    match &next_level_folders {
        Ok(next_level_folders) => {
            if next_level_folders.len() > 0 {
                let mut next_level_folder_ids: Vec<i64> = Vec::new();

                let mut last_entry_id = next_level_folders[0].entry_id;
                let mut start_i = 0;

                // Break up the rows from the database into slices. Each slice contains rules for one entry.
                for i in 0..next_level_folders.len() {
                    let _rule = &next_level_folders[i];

                    if _rule.entry_id != last_entry_id || i == next_level_folders.len() - 1 {
                        let end_i = if i == next_level_folders.len() - 1 {
                            i + 1
                        } else {
                            i
                        };

                        // _rule is NOT the entry we are currenly processing! It's the next one! Hence the _ prefix
                        let target_entry = &next_level_folders[start_i];

                        let (result_groups, result_user) =
                            process_storage_entry(&next_level_folders[start_i..end_i]);

                        if result_user.0 == StorageAccessType::Deny
                            || (!result_groups.is_empty()
                                && result_groups
                                    .values()
                                    .all(|x| x.0 == StorageAccessType::Deny))
                        {
                            return Err("Access denied".to_string());
                        }

                        next_level_folder_ids.push(target_entry.entry_id);
                        folder_parents.insert(target_entry.entry_id, target_entry.parent_folder);

                        start_i = i;
                    }

                    last_entry_id = _rule.entry_id;
                }

                let _ = get_subfolders_level_with_access_rules(
                    endpoint_id,
                    folder_parents,
                    next_level_folder_ids,
                    access,
                    access_action,
                    pool,
                )
                .await;
            }

            return Ok(());
        }
        Err(_) => {
            return Err("Could not query the database for the next level of folders".to_string());
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
) -> Result<HashMap<String, String>, &str> {
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
                return Err("Unable to traverse the folders tree");
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
                return Err("Unable to retrieve requested target_files");
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
) -> Result<(usize, usize), String> {
    let now = Instant::now();

    // Find the endpoint so we know where the files we find will be stored physically
    let target_endpoint = get_storage_endpoint(endpoint_id, pool).await;

    if target_endpoint.is_err() {
        return Err("Could not get target endpoint".to_string());
    }

    let target_endpoint = target_endpoint.unwrap();

    let endpoint_base_path = target_endpoint.base_path;
    let endpoint_artifacts_path = target_endpoint.artifacts_path;
    let endpoint_files_path = Path::new(&endpoint_base_path);

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

            let get_subfolders_result =
                get_subfolders_level(endpoint_id, &mut all_folders, target_folders, pool).await;

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
        return Err("Could not start a transaction".to_string());
    }

    let mut transaction = transaction.unwrap();

    // Delete files *inside* provided target folders (arbitrarily deep inside)
    if all_folders.len() > 0 {
        if let Some(access) = access {
            let (access_user_id, access_user_group_ids) = access;

            let files_info_result = sqlx::query_as::<_, ProccessEntryRuleInput>(
                "SELECT 2 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, storage_entries.filesystem_id, storage_entries.parent_folder, storage_access.access_type::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id FROM storage_entries

                LEFT JOIN storage_access
                ON storage_access.entry_id = storage_entries.id
                AND storage_access.endpoint_id = storage_entries.endpoint_id
                AND storage_access.access_type != 'inherit'::storage_access_type
                AND storage_access.action = 'delete'::storage_access_action_type
                AND (
                    (storage_access.executor_type = 'user_group'::storage_access_executor_type
                    AND storage_access.executor_id = ANY($3))
                    OR
                    (storage_access.executor_type = 'user'::storage_access_executor_type
                    AND storage_access.executor_id = $4)
                )

                WHERE storage_entries.endpoint_id = $1
                AND storage_entries.parent_folder = ANY($2)
                AND storage_entries.entry_type = 'file'::storage_entry_type

                UNION ALL

                SELECT 1 AS rule_source, 1 AS tree_step, storage_entries.id AS entry_id, storage_entries.id AS target_entry_id, storage_entries.filesystem_id, storage_entries.parent_folder, storage_access_template_rules.access_type::TEXT, storage_access_template_rules.executor_type::TEXT, storage_access_template_rules.executor_id FROM storage_entries

                LEFT JOIN storage_access_template_entries
                ON storage_access_template_entries.entry_id = storage_entries.id
                AND storage_access_template_entries.entry_endpoint_id = storage_entries.endpoint_id

                LEFT JOIN storage_access_template_rules
                ON storage_access_template_entries.template_id = storage_access_template_rules.template_id
                AND storage_access_template_rules.access_type != 'inherit'::storage_access_type
                AND storage_access_template_rules.action = 'delete'::storage_access_action_type
                AND (
                    (storage_access_template_rules.executor_type = 'user_group'::storage_access_executor_type
                    AND storage_access_template_rules.executor_id = ANY($3))
                    OR
                    (storage_access_template_rules.executor_type = 'user'::storage_access_executor_type
                    AND storage_access_template_rules.executor_id = $4)
                )

                WHERE storage_entries.endpoint_id = $1
                AND storage_entries.parent_folder = ANY($2)
                AND storage_entries.entry_type = 'file'::storage_entry_type

                ORDER BY entry_id ASC, rule_source DESC"
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .bind(access_user_group_ids)
            .bind(access_user_id)
            .fetch_all(&mut *transaction).await;

            if files_info_result.is_err() {
                return Err("Could not retrieve info about files from the database".to_string());
            }

            let files_info_result = files_info_result.unwrap();

            if !files_info_result.is_empty() {
                let mut last_entry_id = files_info_result[0].entry_id;
                let mut start_i = 0;

                // Break up the rows from the database into slices. Each slice contains rules for one entry.
                for i in 0..files_info_result.len() {
                    let _rule = &files_info_result[i];

                    if _rule.entry_id != last_entry_id || i == files_info_result.len() - 1 {
                        let end_i = if i == files_info_result.len() - 1 {
                            i + 1
                        } else {
                            i
                        };

                        // _rule is NOT the entry we are currenly processing! It's the next one! Hence the _ prefix
                        let target_entry = &files_info_result[start_i];

                        let (result_groups, result_user) =
                            process_storage_entry(&files_info_result[start_i..end_i]);

                        if result_user.0 == StorageAccessType::Deny
                            || (!result_groups.is_empty()
                                && result_groups
                                    .values()
                                    .all(|x| x.0 == StorageAccessType::Deny))
                        {
                            return Err("Access denied".to_string());
                        }

                        file_filesystem_ids.push(target_entry.filesystem_id.clone().unwrap());

                        start_i = i;
                    }

                    last_entry_id = _rule.entry_id;
                }
            }

            let delete_folder_files_result = sqlx::query(
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2) AND entry_type = 'file'::storage_entry_type",
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .fetch_all(&mut *transaction)
            .await;

            if delete_folder_files_result.is_err() {
                return Err("Could not delete files from the database".to_string());
            }
        } else {
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
                    return Err("Could not delete files from the database".to_string());
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
            return Err("Could not delete files from the database".to_string());
        }

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
            return Err("Could not delete folders from the database".to_string());
        }
    }

    if cfg!(debug_assertions) {
        debug!(
            "delete_entries tree traversal & access checks: {}ms",
            now.elapsed().as_millis()
        );
    }

    let transaction_result = transaction.commit().await;

    if transaction_result.is_err() {
        return Err("Could not commit the transaction".to_string());
    }

    // We have successfully deleted all the underlying files and folders from the database,
    // now we can actually delete the files from the filesystem
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
    entry_ids: Vec<i64>,
    target_folder_id: Option<i64>,
    pool: &RequestPool,
) -> Result<(), String> {
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

    if move_result.is_err() {
        return Err("Could not move storage entries".to_string());
    }

    Ok(())
}

pub async fn rename_entry(
    endpoint_id: i32,
    entry_id: i64,
    new_name: &str,
    pool: &RequestPool,
) -> Result<(), String> {
    let rename_result =
        sqlx::query("UPDATE storage_entries SET name = $1 WHERE id = $2 AND endpoint_id = $3")
            .bind(new_name)
            .bind(entry_id)
            .bind(endpoint_id)
            .execute(&*pool)
            .await;

    if rename_result.is_err() {
        return Err("Could not rename a storage entry".to_string());
    }

    Ok(())
}

pub fn generate_image_entry_thumbnail(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), String> {
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
                    Err("Could not generate a thumbnail for an image storage entry".to_string())
                }
            } else {
                Err("Could not execute the convert command".to_string())
            }
        } else {
            Err("Could not find the convert binary".to_string())
        }
    } else {
        Ok(())
    }
}

pub fn generate_video_entry_thumbnail(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), String> {
    let ffmpeg_bin_path = env::var("FFMPEG_BIN");

    if let Ok(ffmpeg_bin_path) = &ffmpeg_bin_path {
        let ffmpeg_bin_path = Path::new(&ffmpeg_bin_path);

        if ffmpeg_bin_path.exists() {
            let file_path = Path::new(endpoint_path).join(&filesystem_id);
            let endpoint_thumbnails_path = Path::new(endpoint_artifacts_path).join("thumbnails");

            let ffmpeg_result = Command::new(ffmpeg_bin_path)
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

            if let Ok(ffmpeg_result) = ffmpeg_result {
                if ffmpeg_result.status.success() {
                    Ok(())
                } else {
                    Err("Could not generate a thumbnail for a video storage entry".to_string())
                }
            } else {
                Err("Could not execute the ffmpeg command".to_string())
            }
        } else {
            Err("Could not find the ffmpeg binary".to_string())
        }
    } else {
        Ok(())
    }
}

pub fn generate_browser_friendly_video(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), String> {
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
                    return Err("Could not create a directory for preview videos".to_string());
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
                    .arg("2M")
                    .arg("-b:a")
                    .arg("192k")
                    .arg("-vf")
                    .arg("scale_cuda=-2:720")
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
                    .arg("2M")
                    .arg("-b:a")
                    .arg("192k")
                    .arg("-vf")
                    .arg("scale=-2:720")
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
                    Err(
                        "Could not generate a browser friendly video render for a storage entry"
                            .to_string(),
                    )
                }
            } else {
                Err("Could not execute the ffmpeg command".to_string())
            }
        } else {
            Err("Could not find the ffmpeg binary".to_string())
        }
    } else {
        Ok(())
    }
}

pub fn generate_audio_entry_cover_thumbnail(
    filesystem_id: &str,
    endpoint_path: &str,
    endpoint_artifacts_path: &str,
) -> Result<(), String> {
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
                    Err(
                        "Could not generate a cover image thumbnail for an audio storage entry"
                            .to_string(),
                    )
                }
            } else {
                Err("Could not execute the ffmpeg command".to_string())
            }
        } else {
            Err("Could not find the ffmpeg binary".to_string())
        }
    } else {
        Ok(())
    }
}
