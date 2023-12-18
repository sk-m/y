use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{put, web, HttpResponse, Responder};
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
    pool: web::Data<RequestPool>,
    form: web::Json<UpdatePasswordInput>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("change_user_password"))
        .is_some();

    if !action_allowed {
        return error("update_password.unauthorized");
    }

    let target_user_id = path.into_inner();

    let password_salt = SaltString::generate(&mut OsRng);
    let password_hash = Pbkdf2.hash_password(form.password.as_bytes(), &password_salt);

    match password_hash {
        Ok(password_hash) => {
            let password_hash = password_hash.to_string();

            let result = sqlx::query("UPDATE users SET password = $1 WHERE id = $2")
                .bind(password_hash.as_str())
                .bind(target_user_id)
                .execute(&**pool)
                .await;

            match result {
                Ok(result) => {
                    if result.rows_affected() == 1 {
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
