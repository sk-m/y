use std::{collections::HashMap, fs::remove_file, path::Path};

use async_recursion::async_recursion;
use serde::Serialize;
use sqlx::FromRow;

use crate::util::RequestPool;

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
struct StorageFolderIdRow {
    id: i64,
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
        "SELECT id, name FROM storage_folders WHERE endpoint_id = $1 AND parent_folder = $2",
    )
    .bind(endpoint_id)
    .bind(target_folder_id)
    .fetch_all(pool)
    .await;

    // Find files inside of the target folder
    let folder_files = sqlx::query_as::<_, PartialStorageFileRow>(
        "SELECT filesystem_id, name, extension FROM storage_files WHERE endpoint_id = $1 AND parent_folder = $2",
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
    let target_folder_ids_param = folder_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<String>>()
        .join(",");

    let next_level_folders = sqlx::query_as::<_, StorageFolderIdRow>(
        format!(
            "SELECT id FROM storage_folders WHERE endpoint_id = $1 AND parent_folder IN ({})",
            target_folder_ids_param
        )
        .as_str(),
    )
    .bind(endpoint_id)
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
        Err(err) => {
            dbg!(err);
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
        let target_files_param = target_files
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<String>>()
            .join(",");

        let files = sqlx::query_as::<_, PartialStorageFileRow>(
            format!(
                "SELECT filesystem_id, name, extension FROM storage_files WHERE endpoint_id = $1 AND id IN ({})",
                target_files_param
            )
            .as_str(),
        )
        .bind(endpoint_id)
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
    pool: &RequestPool,
) -> Result<(usize, usize), String> {
    // Find the endpoint so we know where the files we find will be stored
    let target_endpoint =
        sqlx::query_scalar::<_, String>("SELECT base_path FROM storage_endpoints WHERE id = $1")
            .bind(endpoint_id)
            .fetch_one(pool)
            .await;

    if target_endpoint.is_err() {
        dbg!(target_endpoint.unwrap_err());
        return Err("Could not get target endpoint".to_string());
    }

    let endpoint_base_path = target_endpoint.unwrap();
    let endpoint_files_path = Path::new(&endpoint_base_path);

    // Recursively find all the folders that reside inside target folders
    let mut all_folders: Vec<i64> = target_folders.clone();

    if all_folders.len() > 0 {
        let get_subfolders_result =
            get_subfolders_level(endpoint_id, &mut all_folders, target_folders, pool).await;

        if get_subfolders_result.is_err() {
            return Err(get_subfolders_result.unwrap_err());
        }
    }

    // Delete the files from all of the folders we have found
    // At this point, we have travesed the storage tree and have found
    // all the entries that reside inside the target folders, on any level
    let folder_ids_param = all_folders
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<String>>()
        .join(",");

    let target_files_param = target_files
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<String>>()
        .join(",");

    let transaction = pool.begin().await;

    match transaction {
        Ok(mut transaction) => {
            let mut file_filesystem_ids: Vec<String> = Vec::new();

            // Delete files inside target folders
            if all_folders.len() > 0 {
                let delete_folder_files_result = sqlx::query_scalar::<_, String>(
                    format!(
                        "DELETE FROM storage_files WHERE endpoint_id = $1 AND parent_folder IN ({}) RETURNING filesystem_id",
                        folder_ids_param
                    )
                    .as_str(),
                )
                .bind(endpoint_id)
                .fetch_all(&mut *transaction)
                .await;

                if delete_folder_files_result.is_err() {
                    return Err("Could not delete files from the database".to_string());
                }

                file_filesystem_ids.extend(delete_folder_files_result.unwrap());
            }

            // Delete target files
            if target_files.len() > 0 {
                let delete_target_files_result = sqlx::query_scalar::<_, String>(
                    format!(
                        "DELETE FROM storage_files WHERE endpoint_id = $1 AND id IN ({}) RETURNING filesystem_id",
                        target_files_param
                    )
                    .as_str(),
                )
                .bind(endpoint_id)
                .fetch_all(&mut *transaction)
                .await;

                if delete_target_files_result.is_err() {
                    return Err("Could not delete files from the database".to_string());
                }

                file_filesystem_ids.extend(delete_target_files_result.unwrap());
            }

            // Delete target folders & subfolders
            if all_folders.len() > 0 {
                let delete_folders_result = sqlx::query(
                    format!(
                        "DELETE FROM storage_folders WHERE endpoint_id = $1 AND id IN ({})",
                        folder_ids_param
                    )
                    .as_str(),
                )
                .bind(endpoint_id)
                .execute(&mut *transaction)
                .await;

                if delete_folders_result.is_err() {
                    return Err("Could not delete folders from the database".to_string());
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

                // TODO log this incident
                if fs_remove_result.is_err() {
                    dbg!(
                        "Could not remove a file from the filesystem.",
                        endpoint_id,
                        file_filesystem_id,
                        fs_remove_result.unwrap_err()
                    );
                }
            }

            return Ok((file_filesystem_ids.len(), all_folders.len()));
        }
        Err(_) => {
            return Err("Could not start a transaction".to_string());
        }
    }
}
