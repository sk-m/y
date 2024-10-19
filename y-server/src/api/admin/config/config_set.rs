use crate::user::get_user_from_request;
use crate::util::RequestPool;
use crate::{request::error, user::get_client_rights};
use actix_web::{put, web, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;

#[derive(Deserialize)]
struct ConfigSetInput {
    value: String,
}

#[put("/config/{config_key}")]
async fn config_set(
    pool: web::Data<RequestPool>,
    form: web::Json<ConfigSetInput>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let key = path.into_inner();
    let value = form.into_inner().value;

    // TODO cleanup
    let client = get_user_from_request(&pool, &req).await;
    let client_user = &client.as_ref().unwrap().0;
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("update_config"))
        .is_some();

    if !action_allowed {
        return error("config.set.unauthorized");
    }

    let result = sqlx::query(
        "UPDATE config SET value = $2, updated_by = $3, updated_at = now() WHERE key = $1",
    )
    .bind(key)
    .bind(value)
    .bind(client_user.id)
    .fetch_all(&**pool)
    .await;

    match result {
        Ok(_) => {
            return HttpResponse::Ok().body("{}");
        }
        Err(_) => {
            return error("config.set.internal");
        }
    }
}
