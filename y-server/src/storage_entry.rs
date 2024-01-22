use std::{fs::remove_file, path::Path};

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

#[derive(FromRow)]
struct StorageFolderIdRow {
    id: i64,
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
