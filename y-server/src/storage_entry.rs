use std::{collections::HashMap, env, fs::remove_file, path::Path, process::Command};

use async_recursion::async_recursion;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    storage_access::StorageAccessType, storage_endpoint::get_storage_endpoint, util::RequestPool,
};
use log::*;

#[derive(Serialize, Deserialize, PartialEq)]
pub enum StorageEntryType {
    #[serde(rename = "file")]
    File,
    #[serde(rename = "folder")]
    Folder,
}

impl StorageEntryType {
    pub fn as_str(&self) -> &'static str {
        match self {
            StorageEntryType::File => "file",
            StorageEntryType::Folder => "folder",
        }
    }
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
    folder_access: &mut HashMap<i64, StorageAccessType>,
    folder_ids: Vec<i64>,
    access_user_group_ids: &Vec<i32>,
    access_action: &str,
    pool: &RequestPool,
) -> Result<(), String> {
    #[derive(FromRow)]
    struct GetSubfoltersLevelRow {
        id: i64,
        parent_folder: i64,
        access_type: Option<String>,
    }

    let next_level_folders = 
        sqlx::query_as::<_, GetSubfoltersLevelRow>(
            "SELECT storage_entries.id, storage_entries.parent_folder, storage_access.access_type::TEXT FROM storage_entries
            LEFT JOIN storage_access ON
            storage_access.entry_id = storage_entries.id
            AND storage_access.endpoint_id = storage_entries.endpoint_id
            AND storage_access.entry_type = 'folder'::storage_entry_type
            AND storage_access.action = $4::storage_access_action_type
            AND storage_access.access_type != 'inherit'::storage_access_type
            AND storage_access.executor_type = 'user_group'::storage_access_executor_type
            AND storage_access.executor_id = ANY($3)
            WHERE storage_entries.endpoint_id = $1 AND storage_entries.parent_folder = ANY($2) AND storage_entries.entry_type = 'folder'::storage_entry_type"
        )
        .bind(endpoint_id)
        .bind(folder_ids)
        .bind(access_user_group_ids)
        .bind(access_action)
        .fetch_all(pool)
        .await;

    match &next_level_folders {
        Ok(next_level_folders) => {
            let mut next_level_folder_ids: Vec<i64> = Vec::new();
            let mut last_pushed_folder_id: i64 = -1;

            for row in next_level_folders {
                let folder_id = row.id;
                let folder_access_type = if let Some(access_type) = &row.access_type {
                    match access_type.as_str() {
                        "allow" => StorageAccessType::Allow,
                        "deny" => StorageAccessType::Deny,
                        _ => StorageAccessType::Unset,
                    }
                } else {
                    StorageAccessType::Unset
                };

                if last_pushed_folder_id == folder_id {
                    if let Some(folder_access_entry) = folder_access.get_mut(&folder_id) {
                        if folder_access_type != StorageAccessType::Unset
                            && (folder_access_entry == &StorageAccessType::Unset
                                || folder_access_entry == &StorageAccessType::Deny)
                        {
                            *folder_access_entry = folder_access_type;
                        }
                    } else {
                        folder_access.insert(folder_id, folder_access_type);
                    }
                } else {
                    folder_access.insert(folder_id, folder_access_type);
                    next_level_folder_ids.push(folder_id);
                    folder_parents.insert(folder_id, Some(row.parent_folder));
                }

                last_pushed_folder_id = folder_id;
            }

            if next_level_folder_ids.len() > 0 {
                get_subfolders_level_with_access_rules(
                    endpoint_id,
                    folder_parents,
                    folder_access,
                    next_level_folder_ids,
                    access_user_group_ids,
                    access_action,
                    pool,
                )
                .await?;
            }

            return Ok(());
        }
        Err(err) => {
            error!("Could not query the database for the next level of folders {:?}", err);
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
 * @param pool - Database connection pool
 *
 * @returns (usize, usize) - (total number of deleted files, total number of deleted folders)
 */
pub async fn delete_entries(
    endpoint_id: i32,
    target_folders: Vec<i64>,
    target_files: Vec<i64>,

    access_user_group_ids: Option<&Vec<i32>>,

    pool: &RequestPool,
) -> Result<(usize, usize), String> {
    // Find the endpoint so we know where the files we find will be stored physically
    let target_endpoint = get_storage_endpoint(endpoint_id, pool).await;

    if target_endpoint.is_err() {
        return Err("Could not get target endpoint".to_string());
    }

    let target_endpoint = target_endpoint.unwrap();

    let endpoint_base_path = target_endpoint.base_path;
    let endpoint_artifacts_path = target_endpoint.artifacts_path;
    let endpoint_files_path = Path::new(&endpoint_base_path);

    // Setup the containers where the results of the recursive search will be stored
    
    // HashMap of folders to their parent folder id
    // pre-populate it with the target folders. We set the parent to None (as if they are inside the endpoint's root folder)
    // because we do not care about anything above the target folders. We just pretend that they reside inside the root
    let mut folder_parents: HashMap<i64, Option<i64>> =
        target_folders.iter().map(|id| (*id, None)).collect();

    // HashMap of files to their parent folder id
    // pre-populate it with the target files. We set the parent to None (as if they are inside the endpoint's root folder)
    // because we do not care about anything above the target files. We just pretend that they reside inside the root
    let mut file_parents: HashMap<i64, Option<i64>> =
        target_files.iter().map(|id| (*id, None)).collect();

    // HashMap of folders and files to their *explicit* access rules
    // (explicit meaning the rules are set directly to the files and
    // folders themselves, not inherited from parents)
    let mut folder_access: HashMap<i64, StorageAccessType> = HashMap::new();
    let mut file_access: HashMap<i64, StorageAccessType> = HashMap::new();

    // Arrays of *all* the files and folders we will find after the recursive search
    // These may be the files and folders arbitrarily deep inside the target folders
    let mut all_files: Vec<i64> = target_files.clone();
    let mut all_folders: Vec<i64> = Vec::new();

    // Recursively find all the folders that reside inside target folders
    if folder_parents.len() > 0 {
        if let Some(access_user_group_ids) = access_user_group_ids {
            let get_subfolders_result = get_subfolders_level_with_access_rules(
                endpoint_id,
                &mut folder_parents,
                &mut folder_access,
                target_folders,
                &access_user_group_ids,
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

            let get_subfolders_result = get_subfolders_level(endpoint_id, &mut all_folders, target_folders, pool).await;

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

    // We will store the filesystem ids of all the files we are about to delete
    // We need to know the filesystem ids to actually delete the files from
    // the filesystem after we delete them from the database
    let mut file_filesystem_ids: Vec<String> = Vec::new();

    #[derive(FromRow)]
    struct EntryIdAndFilesystemId {
        id: i64,
        filesystem_id: String,
    }

    // Delete files *inside* provided target folders (arbitrarily deep inside)
    if all_folders.len() > 0 {
        if let Some(user_group_ids) = access_user_group_ids {
            #[derive(FromRow)]
            struct GetFileIdAndAccessRow {
                id: i64,
                filesystem_id: String,
                parent_folder: Option<i64>,
                access_type: Option<String>,
            }

            let files_info_result = sqlx::query_as::<_, GetFileIdAndAccessRow>(
                "SELECT storage_entries.id, storage_entries.filesystem_id, storage_entries.parent_folder, storage_access.access_type::TEXT FROM storage_entries
                LEFT JOIN storage_access ON
                storage_access.entry_id = storage_entries.id
                AND storage_access.endpoint_id = storage_entries.endpoint_id
                AND storage_access.entry_type = 'file'::storage_entry_type
                AND storage_access.action = 'delete'::storage_access_action_type
                AND storage_access.access_type != 'inherit'::storage_access_type
                AND storage_access.executor_type = 'user_group'::storage_access_executor_type
                AND storage_access.executor_id = ANY($3)
                WHERE storage_entries.endpoint_id = $1
                AND storage_entries.parent_folder = ANY($2)
                AND storage_entries.entry_type = 'file'::storage_entry_type"
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .bind(user_group_ids)
            .fetch_all(&mut *transaction).await;

            if files_info_result.is_err() {
                return Err(
                    "Could not retrieve info about files from the database".to_string()
                );
            }

            let files_info_result = files_info_result.unwrap();

            let mut last_pushed_file_id: i64 = -1;

            for row in files_info_result {
                let file_id = row.id;
                let file_access_type = if let Some(access_type) = &row.access_type {
                    match access_type.as_str() {
                        "allow" => StorageAccessType::Allow,
                        "deny" => StorageAccessType::Deny,
                        _ => StorageAccessType::Unset,
                    }
                } else {
                    StorageAccessType::Unset
                };

                if last_pushed_file_id == file_id {
                    if let Some(file_access_entry) = file_access.get_mut(&file_id) {
                        if file_access_type != StorageAccessType::Unset
                            && (file_access_entry == &StorageAccessType::Unset
                                || file_access_entry == &StorageAccessType::Deny)
                        {
                            *file_access_entry = file_access_type;
                        }
                    } else {
                        file_access.insert(file_id, file_access_type);
                    }
                } else {
                    file_access.insert(file_id, file_access_type);
                    file_parents.insert(file_id, row.parent_folder);
                    file_filesystem_ids.push(row.filesystem_id);
                    all_files.push(file_id);
                }

                last_pushed_file_id = file_id;
            }

            let delete_folder_files_result = sqlx::query_as::<_, EntryIdAndFilesystemId>(
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
            let delete_folder_files_result = sqlx::query_as::<_, EntryIdAndFilesystemId>(
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = ANY($2) AND entry_type = 'file'::storage_entry_type RETURNING id, filesystem_id",
            )
            .bind(endpoint_id)
            .bind(&all_folders)
            .fetch_all(&mut *transaction)
            .await;

            match delete_folder_files_result {
                Ok(delete_folder_files_result) => {
                    all_files
                        .extend(delete_folder_files_result.iter().map(|entry| entry.id));

                    file_filesystem_ids.extend(
                        delete_folder_files_result
                            .into_iter()
                            .map(|entry| entry.filesystem_id),
                    );
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
                "DELETE FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2) AND entry_type = 'file'::storage_entry_type RETURNING filesystem_id",
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
        let delete_folders_result = sqlx::query(
            "DELETE FROM storage_entries WHERE endpoint_id = $1 AND id = ANY($2) AND entry_type = 'folder'::storage_entry_type",
        )
        .bind(endpoint_id)
        .bind(&all_folders)
        .execute(&mut *transaction)
        .await;

        if delete_folders_result.is_err() {
            return Err("Could not delete folders from the database".to_string());
        }
    }

    // Now we have deleted all the underlying files and folders from the database,
    // but we have not yet commited our changes, because we need to perform access rules check first
    if access_user_group_ids.is_some() {
        let mut cascade_down_check_result = true;

        'files_loop: for file in file_access {
            match file.1 {
                StorageAccessType::Allow => {
                    continue;
                }
                StorageAccessType::Deny => {
                    cascade_down_check_result = false;
                    break 'files_loop;
                }
                _ => {
                    let mut parent = &file_parents[&file.0];
    
                    'parents_loop: loop {
                        if let Some(some_parent) = parent {
                            if let Some(access_type) = folder_access.get(some_parent) {
                                match access_type {
                                    StorageAccessType::Allow => {
                                        break 'parents_loop;
                                    }
                                    StorageAccessType::Deny => {
                                        cascade_down_check_result = false;
                                        break 'files_loop;
                                    }
                                    _ => {}
                                }
                            }
    
                            parent = &folder_parents[some_parent];
                            continue 'parents_loop;
                        }
    
                        break 'parents_loop;
                    }
                }
            }
        }

        if !cascade_down_check_result {
            transaction.rollback().await.unwrap();
    
            return Err("Unauthorized".to_string());
        }
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
    entry_type: StorageEntryType,
    entry_id: i64,
    new_name: &str,
    pool: &RequestPool,
) -> Result<(), String> {
    let mut transaction = pool.begin().await.unwrap();

    match entry_type {
        StorageEntryType::File => {
            let file_result = sqlx::query(
                "UPDATE storage_entries SET name = $1 WHERE id = $2 AND endpoint_id = $3 AND entry_type = 'file'::storage_entry_type",
            )
            .bind(new_name)
            .bind(entry_id)
            .bind(endpoint_id)
            .execute(&mut *transaction)
            .await;

            if file_result.is_err() {
                return Err("Could not rename a storage file".to_string());
            }
        }
        StorageEntryType::Folder => {
            let folder_result = sqlx::query(
                "UPDATE storage_entries SET name = $1 WHERE id = $2 AND endpoint_id = $3 AND entry_type = 'folder'::storage_entry_type",
            )
            .bind(new_name)
            .bind(entry_id)
            .bind(endpoint_id)
            .execute(&mut *transaction)
            .await;

            if folder_result.is_err() {
                return Err("Could not rename a storage folder".to_string());
            }
        }
    }

    let transaction_result = transaction.commit().await;

    if transaction_result.is_err() {
        return Err("Could not commit the rename transaction".to_string());
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
