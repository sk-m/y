use std::{fs::remove_file, path::Path};

use crate::util::RequestPool;
use log::*;

pub async fn cleanup_storage_archives(pool: &RequestPool) {
    info!("[scheduled] Cleaning up expired storage archives...");

    // TODO configurable value
    let latest_valid_date = chrono::Utc::now().naive_utc() - chrono::Duration::hours(12);

    let db_delete_storage_archives = sqlx::query_scalar::<_, String>(
        "DELETE FROM storage_archives WHERE created_at < $1 RETURNING filesystem_id",
    )
    .bind(latest_valid_date)
    .fetch_all(pool)
    .await;

    match db_delete_storage_archives {
        Ok(db_delete_storage_archives) => {
            for file_filesystem_id in db_delete_storage_archives.into_iter() {
                let file_path = Path::new("upload_staging")
                    .join(&file_filesystem_id)
                    .to_str()
                    .unwrap()
                    .to_string();

                let _ = remove_file(file_path);
            }
        }
        Err(error) => {
            error!(
                "Could not delete expired storage archive rows from the database. {}",
                error
            );

            return;
        }
    }
}
