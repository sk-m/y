use serde::Serialize;
use sqlx::FromRow;

use crate::util::RequestPool;

#[derive(FromRow, Serialize, Debug)]
pub struct StorageEndpoint {
    pub id: i32,
    pub name: String,
    pub endpoint_type: String,
    pub status: String,
    pub preserve_file_structure: bool,
    pub base_path: String,
    pub description: Option<String>,
}

pub async fn get_storage_endpoint(
    endpoint_id: i32,
    pool: &RequestPool,
) -> Result<StorageEndpoint, sqlx::Error> {
    sqlx::query_as::<_, StorageEndpoint>("SELECT id, name, endpoint_type::TEXT, status::TEXT, preserve_file_structure, base_path, description FROM storage_endpoints WHERE id = $1")
        .bind(endpoint_id)
        .fetch_one(pool)
        .await
}
