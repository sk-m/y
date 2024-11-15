use actix_web::{cookie::Cookie, post, web, HttpResponse, Responder};
use pbkdf2::{
    password_hash::{PasswordHash, PasswordVerifier},
    Pbkdf2,
};
use serde::Deserialize;

use crate::{
    request::error,
    user::{create_user_session, User},
};

use crate::util::RequestPool;

#[derive(Deserialize)]
struct LoginInput {
    username: String,
    password: String,
}

#[post("/login")]
async fn login(pool: web::Data<RequestPool>, form: web::Json<LoginInput>) -> impl Responder {
    let provided_password = form.password.clone();

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = $1")
        .bind(&form.username)
        .fetch_one(&**pool)
        .await;

    if let Ok(user) = user {
        match &user.password {
            Some(password) => {
                let parsed_password_hash = PasswordHash::new(&password);

                if let Ok(parsed_password_hash) = parsed_password_hash {
                    let passwords_match =
                        Pbkdf2.verify_password(provided_password.as_bytes(), &parsed_password_hash);

                    match passwords_match {
                        Ok(_) => {
                            let new_session = create_user_session(&pool, user.id).await;

                            if let Ok(new_session) = new_session {
                                let session_cookie_value = format!(
                                    "{}:{}",
                                    new_session.session_id, new_session.session_key
                                );

                                let session_cookie =
                                    Cookie::build("y-session", session_cookie_value)
                                        .secure(false)
                                        .http_only(true)
                                        .path("/")
                                        .finish();

                                return HttpResponse::Ok().cookie(session_cookie).body("{}");
                            }
                        }
                        Err(_) => {
                            return error("auth.passwords_do_not_match");
                        }
                    }
                } else {
                    return error("auth.internal");
                }
            }
            None => {
                return error("auth.authentication_forbidden");
            }
        }
    } else {
        return error("auth.user_does_not_exist");
    }

    error("auth.internal")
}
