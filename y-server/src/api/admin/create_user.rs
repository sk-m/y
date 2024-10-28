use std::env;

use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::request::error;

use crate::user::get_client_rights;
use crate::util::RequestPool;

use pbkdf2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Pbkdf2,
};

#[derive(Deserialize, Validate)]
struct CreateUserInput {
    #[validate(length(min = 1, max = 127))]
    username: String,
    password: String,
}

#[derive(Serialize)]
struct CreateUserOutput {
    id: i32,
}

#[post("/users")]
async fn create_user(
    pool: web::Data<RequestPool>,
    form: web::Json<CreateUserInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let pbkdf2_rounds = env::var("PBKDF2_ROUNDS")
        .unwrap_or("600000".to_string())
        .parse::<u32>()
        .unwrap();

    let form = form.into_inner();

    if form.validate().is_err() {
        return error("create_user.invalid_input");
    }

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "create_account");

    if !action_allowed {
        return error("create_user.unauthorized");
    }

    let username = form.username.as_str();

    let existing_user: Result<i32, _> =
        sqlx::query_scalar("SELECT id FROM users WHERE username = $1")
            .bind(username)
            .fetch_one(&**pool)
            .await;

    if existing_user.is_ok() {
        return error("create_user.username_taken");
    }

    let password_salt = SaltString::generate(&mut OsRng);
    let password_hash = Pbkdf2.hash_password_customized(
        form.password.as_bytes(),
        None,
        None,
        pbkdf2::Params {
            rounds: pbkdf2_rounds,
            output_length: 32,
        },
        &password_salt,
    );

    match password_hash {
        Ok(password_hash) => {
            let password_hash = password_hash.to_string();

            let result: Result<i32, _> = sqlx::query_scalar(
                "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
            )
            .bind(username)
            .bind(password_hash.as_str())
            .fetch_one(&**pool)
            .await;

            match result {
                Ok(result) => {
                    return HttpResponse::Ok().json(web::Json(CreateUserOutput { id: result }));
                }
                Err(_) => return error("create_user.other"),
            }
        }
        Err(_) => return error("create_user.other"),
    };
}
