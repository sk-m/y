use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::{request::error, user::get_user_from_request, util::RequestPool};

#[derive(Serialize, FromRow)]
struct StorageUserArchiveRow {
    id: i32,
    endpoint_id: i32,
    target_entries_ids: Vec<i64>,

    ready: bool,
    size_bytes: Option<i64>,

    created_at: String,
}

#[derive(Serialize)]
struct StorageUserArchivesOutput {
    user_archives: Vec<StorageUserArchiveRow>,
}

#[get("/user-archives")]
async fn storage_user_archives(
    pool: web::Data<RequestPool>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let user = get_user_from_request(&**pool, &req).await;

    if let Some((user, _)) = user {
        let user_archives = sqlx::query_as::<_, StorageUserArchiveRow>(
            "SELECT id, endpoint_id, target_entries_ids, ready, size_bytes, created_at::TEXT FROM storage_archives WHERE created_by = $1",
        )
        .bind(user.id)
        .fetch_all(&**pool)
        .await;

        match user_archives {
            Ok(user_archives) => {
                HttpResponse::Ok().json(web::Json(StorageUserArchivesOutput { user_archives }))
            }
            Err(_) => error("storage.internal"),
        }
    } else {
        error("storage.access_denied")
    }
}
