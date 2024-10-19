use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::FromRow;

use crate::config::SECRET_CONFIG_KEYS;
use crate::request::error;
use crate::util::RequestPool;

#[derive(FromRow, Serialize)]
struct ConfigOptionRow {
    key: String,
    value: Option<String>,
}

#[derive(Serialize)]
struct ConfigOptionsOutput {
    instance_config: Vec<ConfigOptionRow>,
}

#[get("/instance-config")]
async fn instance_config(pool: web::Data<RequestPool>) -> impl Responder {
    let config = sqlx::query_as::<_, ConfigOptionRow>("SELECT key, value FROM config")
        .fetch_all(&**pool)
        .await;

    match config {
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
                })
                .collect::<Vec<ConfigOptionRow>>();

            return HttpResponse::Ok().json(web::Json(ConfigOptionsOutput {
                instance_config: options_json,
            }));
        }
        Err(_) => {
            return error("instance_config.internal");
        }
    }
}
