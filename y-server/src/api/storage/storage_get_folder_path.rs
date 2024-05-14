use actix_web::{get, web, HttpResponse, Responder};
use log::*;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    request::error,
    storage_access::check_storage_entry_access,
    storage_entry::StorageEntryType,
    user::{get_user_from_request, get_user_groups},
    util::RequestPool,
};

#[derive(Deserialize)]
struct StorageGetFolderPathInput {
    endpoint_id: i32,
    folder_id: i64,
}

#[derive(Serialize, FromRow)]
struct PathSegment {
    id: i64,
    parent_folder: Option<i64>,
    name: String,
}

#[derive(Serialize)]
struct StorageGetFolderPathOutput {
    folder_path: Vec<PathSegment>,
}

#[get("/folder-path")]
async fn storage_get_folder_path(
    pool: web::Data<RequestPool>,
    query: web::Query<StorageGetFolderPathInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let query = query.into_inner();
    let folder_id = query.folder_id;
    let endpoint_id = query.endpoint_id;

    // TODO: slow. This endpoint should be as fast as possible, this check is not ideal
    let client = get_user_from_request(&**pool, &req).await;

    let action_allowed = if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        check_storage_entry_access(
            endpoint_id,
            &StorageEntryType::Folder,
            folder_id,
            "list_entries",
            &group_ids,
            &**pool,
        )
        .await
    } else {
        false
    };

    if !action_allowed {
        return error("storage.get_folder_path.unauthorized");
    }

    // storage_get_folder_path() procedure returns us a path in reversed order, due to the way it's implemented
    let reversed_path =
        sqlx::query_as::<_, PathSegment>("SELECT * FROM storage_get_folder_path($1, $2)")
            .bind(endpoint_id)
            .bind(folder_id)
            .fetch_all(&**pool)
            .await;

    match reversed_path {
        Ok(reversed_path) => {
            let path = reversed_path.into_iter().rev().collect();

            HttpResponse::Ok().json(web::Json(StorageGetFolderPathOutput { folder_path: path }))
        }
        Err(err) => {
            error!("{}", err);

            return error("storage.get_folder_path.internal");
        }
    }
}
