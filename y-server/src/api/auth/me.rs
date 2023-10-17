use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;

use crate::{
    request::{Error, Response},
    user::get_user_from_request,
    util::RequestPool,
};

#[derive(Serialize)]
struct MeOutput {
    id: i32,
    username: String,
}

#[get("/me")]
async fn me(pool: web::Data<RequestPool>, req: HttpRequest) -> impl Responder {
    let session_info = get_user_from_request(&pool, req).await;

    return if let Some((user, _)) = session_info {
        HttpResponse::Ok().json(web::Json(MeOutput {
            id: user.id,
            username: user.username,
        }))
    } else {
        HttpResponse::Unauthorized().json(Response {
            error: Error {
                code: "auth.unauthorized".to_string(),
            },
        })
    };
}
