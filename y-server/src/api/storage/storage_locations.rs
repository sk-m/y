use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::{request::error, util::RequestPool};

#[derive(Serialize, FromRow)]
struct StorageLocationRow {
    id: i32,
    name: String,
    endpoint_id: i32,
    entry_id: i64,
}

#[derive(Serialize)]
struct StorageLocationsOutput {
    locations: Vec<StorageLocationRow>,
}

#[get("/locations")]
async fn storage_locations(pool: web::Data<RequestPool>) -> impl Responder {
    let locations = sqlx::query_as::<_, StorageLocationRow>(
        "SELECT id, name, endpoint_id, entry_id FROM storage_locations",
    )
    .fetch_all(&**pool)
    .await;

    match locations {
        Ok(locations) => HttpResponse::Ok().json(web::Json(StorageLocationsOutput { locations })),
        Err(_) => error("storage.internal"),
    }
}
