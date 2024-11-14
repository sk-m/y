use std::collections::HashMap;

use crate::user::get_user_from_request;
use crate::util::RequestPool;
use crate::{request::error, user::get_client_rights};
use actix_web::{patch, web, HttpRequest, HttpResponse, Responder};
use sqlx::QueryBuilder;

#[patch("/config")]
async fn config_set(
    pool: web::Data<RequestPool>,
    form: web::Json<HashMap<String, String>>,
    req: HttpRequest,
) -> impl Responder {
    let new_config = form.into_inner();

    // TODO cleanup
    let client = get_user_from_request(&pool, &req).await;

    if client.is_none() {
        return error("config.access_denined");
    }

    let (client_user, _) = &client.unwrap();
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("update_config"))
        .is_some();

    if !action_allowed {
        return error("config.access_denined");
    }

    let mut query_builder = QueryBuilder::new(
        "UPDATE config
        SET value = temp_data.value, updated_by = temp_data.updated_by, updated_at = temp_data.updated_at
        FROM (",
    );

    query_builder.push_values(new_config, |mut b, (key, value)| {
        b.push_bind(key);
        b.push_bind(value);
        b.push_bind(client_user.id);
        b.push("now()");
    });

    query_builder.push(
        ") temp_data (key, value, updated_by, updated_at)
        WHERE config.key = temp_data.key",
    );

    let query = query_builder.build();

    let result = query.execute(&**pool).await;

    match result {
        Ok(_) => {
            return HttpResponse::Ok().body("{}");
        }
        Err(_) => {
            return error("config.internal");
        }
    }
}
