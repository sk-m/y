use actix_web::{cookie::Cookie, post, web, HttpRequest, HttpResponse, Responder};

use crate::{
    request::error,
    user::{destroy_user_session, get_user_from_request},
    util::RequestPool,
};

#[post("/logout")]
async fn logout(pool: web::Data<RequestPool>, req: HttpRequest) -> impl Responder {
    let session_info = get_user_from_request(&pool, &req).await;

    if let Some((_, session)) = session_info {
        let result = destroy_user_session(&pool, session.session_id).await;

        if result {
            return HttpResponse::Ok()
                .cookie(
                    Cookie::build("y-session", "")
                        .secure(false)
                        .http_only(true)
                        .path("/")
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
