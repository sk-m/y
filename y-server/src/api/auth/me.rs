use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;

use crate::{
    request::{Response, ResponseError},
    user::{get_client_rights, get_user_from_request, UserRight},
    util::RequestPool,
};

#[derive(Serialize)]
struct MeOutput {
    id: i32,
    username: String,
    user_rights: Vec<UserRight>,
}

#[get("/me")]
async fn me(pool: web::Data<RequestPool>, req: HttpRequest) -> impl Responder {
    let session_info = get_user_from_request(&pool, &req).await;
    let user_rights = get_client_rights(&pool, &req).await;

    return if let Some((user, _)) = session_info {
        HttpResponse::Ok().json(web::Json(MeOutput {
            id: user.id,
            username: user.username,
            user_rights,
        }))
    } else {
        HttpResponse::Unauthorized().json(Response {
            error: ResponseError {
                code: "auth.unauthorized".to_string(),
            },
        })
    };
}
