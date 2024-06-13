use actix_web::{post, web, HttpResponse, Responder};
use log::*;
use serde::Deserialize;
use sqlx::QueryBuilder;
use validator::Validate;

use crate::{
    request::error,
    storage_access::check_storage_entry_access,
    user::{get_client_rights, get_user_from_request, get_user_groups},
    util::RequestPool,
};

#[derive(Deserialize, Validate)]
struct StorageAccessRule {
    access_type: String,
    action: String,
    executor_type: String,
    executor_id: i64,
}

#[derive(Deserialize, Validate)]
struct StorageCreateStorageAccessRulesInput {
    rules: Vec<StorageAccessRule>,
}

#[post("/access-rules/{endpoint_id}/{entry_id}")]
async fn storage_create_access_rules(
    pool: web::Data<RequestPool>,
    path: web::Path<(i32, i64)>,
    form: web::Json<StorageCreateStorageAccessRulesInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("storage.create_storage_access_rules.invalid_input");
    }

    let rules = form.rules;
    let (endpoint_id, entry_id) = path.into_inner();

    let client_rights = get_client_rights(&pool, &req).await;

    let manage_access_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "storage_manage_access");

    if !manage_access_allowed {
        return error("storage.create_storage_access_rules.unauthorized");
    }

    let client = get_user_from_request(&**pool, &req).await;

    let action_allowed = if let Some((client_user, _)) = client {
        let user_groups = get_user_groups(&**pool, client_user.id).await;
        let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

        check_storage_entry_access(
            endpoint_id,
            entry_id,
            "manage_access",
            client_user.id,
            &group_ids,
            &**pool,
        )
        .await
    } else {
        false
    };

    if !action_allowed {
        return error("storage.create_storage_access_rules.unauthorized");
    }

    let mut transaction = pool.begin().await.unwrap();

    let delete_result =
        sqlx::query("DELETE FROM public.storage_access WHERE endpoint_id = $1 AND entry_id = $2")
            .bind(&endpoint_id)
            .bind(&entry_id)
            .execute(&mut *transaction)
            .await;

    if delete_result.is_err() {
        return error("storage.create_storage_access_rules.other");
    }

    if !rules.is_empty() {
        let mut query_builder = QueryBuilder::new(
            "INSERT INTO public.storage_access(endpoint_id, entry_id, access_type, action, executor_type, executor_id) ",
        );

        query_builder.push_values(rules, |mut b, rule| {
            b.push_bind(&endpoint_id);
            b.push_bind(&entry_id);
            b.push_bind(rule.access_type);
            b.push_unseparated("::storage_access_type");
            b.push_bind(rule.action);
            b.push_unseparated("::storage_access_action_type");
            b.push_bind(rule.executor_type);
            b.push_unseparated("::storage_access_executor_type");
            b.push_bind(rule.executor_id);
        });

        query_builder.push(
            " ON CONFLICT (endpoint_id, entry_id, executor_type, action, executor_id) DO UPDATE SET access_type = EXCLUDED.access_type",
        );

        let query = query_builder.build();
        let create_result = query.execute(&mut *transaction).await;

        if create_result.is_err() {
            return error("storage.create_storage_access_rules.other");
        }
    }

    let transaction_result = transaction.commit().await;

    match transaction_result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(err) => {
            error!("{}", err);
            error("storage.create_storage_access_rules.other")
        }
    }
}
