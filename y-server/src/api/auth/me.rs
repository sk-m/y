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
async fn me(pool: RequestPool, req: HttpRequest) -> impl Responder {
    let connection = web::block(move || pool.get()).await;

    let mut connection = connection
        .unwrap()
        .expect("Could not get a connection from the pool.");

    let user_session = get_user_from_request(&mut connection, req);

    if let Some((user, _)) = user_session {
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
    }
}
