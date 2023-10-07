use crate::request::error;
use crate::schema::users;
use crate::util::RequestPool;
use actix_web::{put, web, HttpResponse, Responder};
use diesel::prelude::*;
use diesel::ExpressionMethods;
use serde::Deserialize;

use pbkdf2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Pbkdf2,
};

#[derive(Deserialize)]
struct UpdatePasswordInput {
    password: String,
}

#[put("/users/{user_id}/password")]
async fn update_password(
    pool: RequestPool,
    form: web::Json<UpdatePasswordInput>,
    path: web::Path<i32>,
) -> impl Responder {
    let password = form.password.clone();
    let user_id = path.into_inner();

    let connection = web::block(move || pool.get()).await;

    let mut connection = connection
        .unwrap()
        .expect("Could not get a connection from the pool.");

    let password_salt = SaltString::generate(&mut OsRng);
    let password_hash = Pbkdf2.hash_password(password.as_bytes(), &password_salt);

    match password_hash {
        Ok(password_hash) => {
            let password_hash = password_hash.to_string();

            let result = diesel::update(users::table)
                .filter(users::id.eq(user_id))
                .set(users::password.eq(password_hash.as_str()))
                .execute(&mut connection);

            match result {
                Ok(value) => {
                    if value == 1 {
                        return HttpResponse::Ok().body("{}");
                    } else {
                        return error("update_password.user_not_found");
                    }
                }
                Err(_) => return error("update_password.other"),
            }
        }
        Err(_) => return error("update_password.other"),
    };
}
