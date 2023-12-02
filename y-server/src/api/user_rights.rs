use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

use crate::right::{get_right_categories, RightCategory};

#[derive(Serialize)]
struct RightsOutput {
    categories: Vec<RightCategory>,
}

#[get("/user-rights")]
async fn user_rights() -> impl Responder {
    let categories = get_right_categories();

    HttpResponse::Ok().json(web::Json(RightsOutput { categories }))
}
