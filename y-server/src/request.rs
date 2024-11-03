use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

pub const DEFAULT_LIMIT: i64 = 25;

#[derive(Deserialize)]
pub struct TableInput {
    pub order_by: Option<String>,
    pub direction: Option<String>,

    pub limit: Option<i64>,
    pub skip: Option<i64>,

    pub search: Option<String>,
}

#[derive(Serialize)]
pub struct ResponseError {
    pub code: String,
}

#[derive(Serialize)]
pub struct Response {
    pub error: ResponseError,
}

pub fn error(code: &str) -> HttpResponse {
    HttpResponse::BadRequest().json(web::Json(Response {
        error: ResponseError {
            code: code.to_string(),
        },
    }))
}
