use std::path::Path;

use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::{get, web, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::request::error;

use crate::user::get_user_from_request;
use crate::util::RequestPool;

#[derive(Serialize, FromRow)]
struct StorageUserArchiveRow {
    id: i32,
    endpoint_id: i32,
    filesystem_id: String,

    ready: bool,
}

#[get("/user-archives/{archive_id}/download")]
async fn storage_download_archive(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let archive_id = path.into_inner();

    let client = get_user_from_request(&**pool, &req).await;

    if client.is_none() {
        return error("storage.access_denied");
    }

    let (client_user, _) = client.unwrap();

    let archive = sqlx::query_as::<_, StorageUserArchiveRow>(
        "SELECT id, filesystem_id, endpoint_id, ready FROM storage_archives WHERE id = $1 AND created_by = $2",
    )
    .bind(archive_id)
    .bind(client_user.id)
    .fetch_one(&**pool)
    .await;

    match archive {
        Ok(archive) => {
            let file_path = Path::new("upload_staging").join(&archive.filesystem_id);

            let mut file = actix_files::NamedFile::open(file_path).unwrap();

            file = file.set_content_disposition(ContentDisposition {
                disposition: DispositionType::Attachment,
                parameters: vec![DispositionParam::Filename("download.zip".to_string())],
            });

            return file.into_response(&req);
        }

        Err(_) => error("storage.internal"),
    }
}
