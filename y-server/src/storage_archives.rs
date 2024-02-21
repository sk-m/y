use std::{fs::remove_file, path::Path};

use crate::util::RequestPool;
use log::*;

pub async fn cleanup_storage_archives(pool: &RequestPool) {
    info!("[scheduled] Cleaning up expired storage archives...");

    let latest_valid_date = chrono::Utc::now().naive_utc() - chrono::Duration::hours(24);

    let mut transaction = pool.begin().await.unwrap();

    let delete_storage_archives = sqlx::query_scalar::<_, String>(
        "DELETE FROM storage_archives WHERE created_at < $1 RETURNING filesystem_id",
    )
    .bind(latest_valid_date)
    .fetch_all(&mut *transaction)
    .await;

    match delete_storage_archives {
        Ok(delete_storage_archives) => {
            for file_filesystem_id in delete_storage_archives.into_iter() {
                let file_path = Path::new("upload_staging")
                    .join(&file_filesystem_id)
                    .to_str()
                    .unwrap()
                    .to_string();

                let remove_file_result = remove_file(file_path);

                if remove_file_result.is_err() {
                    error!(
                        "[scheduled] Could not remove an archive file from the filesystem (filesystem_id = {}). {}",
                        file_filesystem_id,
                        remove_file_result.err().unwrap()
                    );
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
