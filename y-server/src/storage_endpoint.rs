use serde::Serialize;
use sqlx::FromRow;

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
