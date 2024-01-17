use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::{request::error, util::RequestPool};

#[derive(Serialize, FromRow)]
struct StorageEndpoint {
    id: i32,
    name: String,
    status: String,
}

#[derive(Serialize)]
struct StorageEndpointsOutput {
    endpoints: Vec<StorageEndpoint>,
}

#[get("/endpoints")]
async fn storage_endpoints(pool: web::Data<RequestPool>) -> impl Responder {
    // TODO?: This endpoint is avilable to all users, but we might want to restrict it a bit
    // ?      and give access only to the users with `storage_read` right, or something like that.

    let endpoints = sqlx::query_as::<_, StorageEndpoint>(
        "SELECT id, name, status::TEXT FROM storage_endpoints WHERE status NOT IN ('disabled')",
    )
    .fetch_all(&**pool)
    .await;

    match endpoints {
        Ok(endpoints) => HttpResponse::Ok().json(web::Json(StorageEndpointsOutput { endpoints })),
        Err(_) => error("storage_endpoints.internal"),
    }
}
