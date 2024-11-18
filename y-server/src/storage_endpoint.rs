use serde::Serialize;
use sqlx::FromRow;

use crate::util::RequestPool;

#[derive(FromRow, Serialize, Debug)]
pub struct StorageEndpointRow {
    pub id: i32,
    pub name: String,
    pub endpoint_type: String,
    pub status: String,
    pub preserve_file_structure: bool,
    pub base_path: String,
    pub artifacts_path: Option<String>,
    pub description: Option<String>,
    pub access_rules_enabled: bool,
    pub vfs_enabled: Option<bool>,
}

pub async fn get_storage_endpoint(
    endpoint_id: i32,
    pool: &RequestPool,
) -> Result<StorageEndpointRow, sqlx::Error> {
    sqlx::query_as::<_, StorageEndpointRow>("SELECT storage_endpoints.id, storage_endpoints.name, storage_endpoints.endpoint_type::TEXT, storage_endpoints.status::TEXT, storage_endpoints.preserve_file_structure, storage_endpoints.base_path, storage_endpoints.artifacts_path, storage_endpoints.description, storage_endpoints.access_rules_enabled, storage_vfs.enabled AS vfs_enabled FROM storage_endpoints LEFT JOIN storage_vfs ON storage_vfs.endpoint_id = storage_endpoints.id WHERE storage_endpoints.id = $1")
        .bind(endpoint_id)
        .fetch_one(pool)
        .await
}
