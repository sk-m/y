use actix_web::{web, HttpResponse};
use serde::Serialize;

#[derive(Serialize)]
pub struct Error {
    pub code: String,
}

#[derive(Serialize)]
pub struct Response {
    pub error: Error,
}

pub fn error(code: &str) -> HttpResponse {
    HttpResponse::BadRequest().json(web::Json(Response {
        error: Error {
            code: code.to_string(),
        },
    }))
}
