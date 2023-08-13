use actix_web::{cookie::Cookie, post, web, HttpRequest, HttpResponse, Responder};

use crate::{
    request::error,
    user::{destroy_user_session, get_user_from_request},
    util::RequestPool,
};

#[post("/logout")]
async fn logout(pool: RequestPool, req: HttpRequest) -> impl Responder {
    let connection = web::block(move || pool.get()).await;

    let mut connection = connection
        .unwrap()
        .expect("Could not get a connection from the pool.");

    let user_session = get_user_from_request(&mut connection, req);

    if let Some((_, session)) = user_session {
        let destroyed = destroy_user_session(&mut connection, session.session_id);

        if destroyed {
            return HttpResponse::Ok()
                .cookie(
                    Cookie::build("y-session", "")
                        .secure(false)
                        .http_only(true)
                        .finish(),
                )
                .body("{}");
        } else {
            return error("auth.invalid_session");
        }
    } else {
        return error("auth.invalid_session");
    }
}
