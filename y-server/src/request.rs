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

impl TableInput {
    pub fn get_direction(&self) -> &str {
        match self.direction.as_ref() {
            Some(direction) => match direction.as_str() {
                "asc" => "ASC",
                "desc" => "DESC",
                _ => "ASC",
            },
            None => "ASC",
        }
    }

    pub fn get_where_sql(&self, search_by: &str, order_by: &str) -> String {
        format!(
            "{} ILIKE '%' || $1 || '%' ORDER BY {} {} LIMIT {} OFFSET {}",
            search_by,
            order_by,
            self.get_direction(),
            self.limit.unwrap_or(DEFAULT_LIMIT),
            self.skip.unwrap_or(0)
        )
    }
}

#[derive(Serialize)]
pub struct ResponseError {
    pub code: String,
    pub message: Option<String>,
}

#[derive(Serialize)]
pub struct Response {
    pub error: ResponseError,
}

pub fn error(code: &str) -> HttpResponse {
    HttpResponse::BadRequest().json(web::Json(Response {
        error: ResponseError {
            code: code.to_string(),
            message: None,
        },
    }))
}

pub fn error_message(code: &str, message: &str) -> HttpResponse {
    HttpResponse::BadRequest().json(web::Json(Response {
        error: ResponseError {
            code: code.to_string(),
            message: Some(message.to_string()),
        },
    }))
}
