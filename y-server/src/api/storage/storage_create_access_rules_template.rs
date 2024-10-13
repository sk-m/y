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
    #[validate(length(min = 1, max = 127))]
    name: String,

    initial_entry_endpoint_id: Option<i32>,
    initial_entry_id: Option<i64>,

    rules: Vec<StorageAccessRule>,
}

#[post("/access-rules/templates")]
async fn storage_create_access_rules_template(
    pool: web::Data<RequestPool>,
    form: web::Json<StorageCreateStorageAccessRulesInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let form = form.into_inner();

    if form.validate().is_err() {
        return error("storage.create_storage_access_rules_template.invalid_input");
    }

    if form.rules.is_empty() {
        return error("storage.create_storage_access_rules_template.invalid_input");
    }

    let rules = form.rules;

    let client_rights = get_client_rights(&pool, &req).await;

    let manage_templates_allowed = client_rights
        .iter()
        .find(|right| {
            right.right_name.eq("storage_manage_access")
                && right
                    .right_options
                    .get("allow_managing_templates")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false)
        })
        .is_some();

    if !manage_templates_allowed {
        return error("storage.create_storage_access_rules_template.unauthorized");
    }

    if form.initial_entry_endpoint_id.is_some() && form.initial_entry_id.is_some() {
        let client = get_user_from_request(&**pool, &req).await;

        let initial_entry_action_allowed = if let Some((client_user, _)) = client {
            let user_groups = get_user_groups(&**pool, client_user.id).await;
            let group_ids = user_groups.iter().map(|g| g.id).collect::<Vec<i32>>();

            check_storage_entry_access(
                form.initial_entry_endpoint_id.unwrap(),
                form.initial_entry_id.unwrap(),
                "manage_access",
                client_user.id,
                &group_ids,
                &**pool,
            )
            .await
        } else {
            false
        };

        if !initial_entry_action_allowed {
            return error("storage.create_storage_access_rules_template.unauthorized");
        }
    }

    let mut transaction = pool.begin().await.unwrap();

    let create_template_result: Result<i32, _> = sqlx::query_scalar(
        "INSERT INTO public.storage_access_templates(name) VALUES ($1) RETURNING id",
    )
    .bind(form.name)
    .fetch_one(&mut *transaction)
    .await;

    if create_template_result.is_err() {
        return error("storage.create_storage_access_rules_template.other");
    }

    let new_template_id = create_template_result.unwrap();

    let mut rules_query_builder = QueryBuilder::new(
        "INSERT INTO public.storage_access_template_rules(template_id, access_type, action, executor_type, executor_id) ",
    );

    rules_query_builder.push_values(rules, |mut b, rule| {
        b.push_bind(new_template_id);
        b.push_bind(rule.access_type);
        b.push_unseparated("::storage_access_type");
        b.push_bind(rule.action);
        b.push_unseparated("::storage_access_action_type");
        b.push_bind(rule.executor_type);
        b.push_unseparated("::storage_access_executor_type");
        b.push_bind(rule.executor_id);
    });

    rules_query_builder.push(
        " ON CONFLICT (template_id, executor_type, action, executor_id) DO UPDATE SET access_type = EXCLUDED.access_type",
    );

    let rules_query = rules_query_builder.build();
    let rules_create_result = rules_query.execute(&mut *transaction).await;

    if rules_create_result.is_err() {
        return error("storage.create_storage_access_rules_template.other");
    }

    if form.initial_entry_endpoint_id.is_some() && form.initial_entry_id.is_some() {
        let add_entry_result  = sqlx::query(
            "INSERT INTO public.storage_access_template_entries(entry_endpoint_id, entry_id, template_id) VALUES ($1, $2, $3)",
        )
        .bind(form.initial_entry_endpoint_id.unwrap())
        .bind(form.initial_entry_id.unwrap())
        .bind(new_template_id)
        .execute(&mut *transaction)
        .await;

        if add_entry_result.is_err() {
            return error("storage.create_storage_access_rules_template.other");
        }
    }

    let transaction_result = transaction.commit().await;

    match transaction_result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage.create_storage_access_rules_template.other"),
    }
}
