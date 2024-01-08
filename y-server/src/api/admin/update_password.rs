use crate::user::get_client_rights;
use crate::util::RequestPool;
use crate::{request::error, user::get_user_groups};
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
    let target_user_id = path.into_inner();

    let client_rights = get_client_rights(&pool, &req).await;
    let target_user_groups = get_user_groups(&pool, target_user_id).await;

    let mut change_user_password_right_present = false;
    let mut client_right_groups_blacklist: Vec<i32> = vec![];

    for right in client_rights {
        if right.right_name.eq("change_user_password") {
            change_user_password_right_present = true;

            if let Some(blacklist) = right.right_options.get("user_groups_blacklist") {
                if blacklist.is_array() {
                    for group_id in blacklist.as_array().unwrap() {
                        if group_id.is_i64() {
                            client_right_groups_blacklist.push(group_id.as_i64().unwrap() as i32);
                        }
                    }
                }
            }
        }
    }

    let mut action_allowed = false;

    if change_user_password_right_present {
        action_allowed = true;

        for group in target_user_groups {
            if client_right_groups_blacklist.contains(&group.id) {
                action_allowed = false;
                break;
            }
        }
    }

    if !action_allowed {
        return error("update_password.unauthorized");
    }

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
