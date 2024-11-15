use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use sqlx::FromRow;

use crate::config::SECRET_CONFIG_KEYS;
use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;

#[derive(FromRow, Serialize)]
struct ConfigOptionRow {
    key: String,
    value: Option<String>,

    // TODO maybe do it cleaner? `updated_by: { user_id: number, user_username: string } | null`
    updated_by: Option<i32>,
    updated_by_username: Option<String>,

    updated_at: Option<String>,
}

#[derive(Serialize)]
struct ConfigOptionsOutput {
    options: Vec<ConfigOptionRow>,
}

#[get("/config")]
async fn config_options(pool: web::Data<RequestPool>, req: HttpRequest) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("update_config"))
        .is_some();

    if !action_allowed {
        return error("config.access_denied");
    }

    let options = sqlx::query_as::<_, ConfigOptionRow>(
        "SELECT key, value, updated_by, updated_at::TEXT, users.username AS updated_by_username FROM config LEFT JOIN users ON config.updated_by = users.id",
    )
    .fetch_all(&**pool)
    .await;

    match options {
        Ok(options) => {
            let options_json = options
                .iter()
                .map(|option| ConfigOptionRow {
                    key: option.key.clone(),
                    value: if SECRET_CONFIG_KEYS.contains(&option.key.as_str()) {
                        None
                    } else {
                        option.value.clone()
                    },
                    updated_by: option.updated_by,
                    updated_by_username: option.updated_by_username.clone(),
                    updated_at: option.updated_at.clone(),
                })
                .collect::<Vec<ConfigOptionRow>>();

            return HttpResponse::Ok().json(web::Json(ConfigOptionsOutput {
                options: options_json,
            }));
        }
        Err(_) => {
            return error("config.internal");
        }
    }
}
