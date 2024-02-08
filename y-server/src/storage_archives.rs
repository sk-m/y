use std::{fs::remove_file, path::Path};

use crate::util::RequestPool;
use log::*;

#[derive(sqlx::FromRow)]
struct PartialStorageEndpointRow {
    id: i32,
    base_path: String,
}

#[derive(sqlx::FromRow)]
struct PartialStorageArchiveRow {
    endpoint_id: i32,
    filesystem_id: String,
}

pub async fn cleanup_storage_archives(pool: &RequestPool) {
    info!("[scheduled] Cleaning up expired storage archives...");

    let endpoints = sqlx::query_as::<_, PartialStorageEndpointRow>(
        "SELECT id, base_path FROM storage_endpoints",
    )
    .fetch_all(pool)
    .await;

    if endpoints.is_err() {
        error!(
            "[scheduled] Could not fetch storage endpoints from the database. {}",
            endpoints.err().unwrap()
        );
        return;
    }

    let endpoints = endpoints.unwrap();

    let latest_date = chrono::Utc::now().naive_utc() - chrono::Duration::hours(24);

    let mut transaction = pool.begin().await.unwrap();

    let delete_storage_archives = sqlx::query_as::<_, PartialStorageArchiveRow>(
        "DELETE FROM storage_archives WHERE created_at < $1 RETURNING filesystem_id, endpoint_id",
    )
    .bind(latest_date)
    .fetch_all(&mut *transaction)
    .await;

    match delete_storage_archives {
        Ok(delete_storage_archives) => {
            for file in delete_storage_archives.into_iter() {
                let file_endpoint = endpoints
                    .iter()
                    .find(|endpoint| endpoint.id == file.endpoint_id);

                match file_endpoint {
                    Some(endpoint) => {
                        let file_path = Path::new(endpoint.base_path.as_str())
                            .join(&file.filesystem_id)
                            .to_str()
                            .unwrap()
                            .to_string();

                        let remove_file_result = remove_file(file_path);

                        if remove_file_result.is_err() {
                            error!(
                                "[scheduled] Could not remove an archive file from the filesystem (filesystem_id = {}). {}",
                                file.filesystem_id,
                                remove_file_result.err().unwrap()
                            );
                        }
                    }
                    None => {
                        error!(
                            "[scheduled] Could not find a storage endpoint with id {}",
                            file.endpoint_id
                        );
                        continue;
                    }
                }
            }
        }
        Err(error) => {
            error!(
                "Could not delete expired storage archive rows from the database. {}",
                error
            );

            transaction.rollback().await.unwrap();
            return;
        }
    }
}
