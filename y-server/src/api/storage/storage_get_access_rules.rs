use actix_web::{get, web, HttpResponse, Responder};
use log::*;
use serde::Serialize;
use sqlx::FromRow;

use crate::{request::error, util::RequestPool};

#[derive(FromRow)]
struct StorageAccessRuleRow {
    access_type: String,
    action: String,
    executor_type: String,
    executor_id: i32,
    group_executor_name: Option<String>,
    user_executor_name: Option<String>,
}

#[derive(Serialize)]
struct StorageAccessRule {
    access_type: String,
    action: String,
    executor_type: String,
    executor_id: i32,
    executor_name: Option<String>,
}

#[derive(Serialize, FromRow)]
struct StorageAccessTemplateRow {
    id: i32,
    name: String,
}

#[derive(Serialize)]
struct StorageAccessRulesOutput {
    rules: Vec<StorageAccessRule>,
    templates: Vec<StorageAccessTemplateRow>,
}

#[get("/access-rules/{endpoint_id}/{entry_id}")]
async fn storage_get_access_rules(
    pool: web::Data<RequestPool>,
    path: web::Path<(i32, i32)>,
) -> impl Responder {
    let (endpoint_id, entry_id) = path.into_inner();

    let rule_rows = sqlx::query_as::<_, StorageAccessRuleRow>("SELECT storage_access.access_type::TEXT, storage_access.action::TEXT, storage_access.executor_type::TEXT, storage_access.executor_id, user_groups.name AS group_executor_name, users.username AS user_executor_name FROM storage_access
    LEFT OUTER JOIN user_groups ON storage_access.executor_id = user_groups.id AND storage_access.executor_type = 'user_group'::storage_access_executor_type
    LEFT OUTER JOIN users ON storage_access.executor_id = users.id AND storage_access.executor_type = 'user'::storage_access_executor_type
    WHERE storage_access.entry_id = $1 AND storage_access.endpoint_id = $2")
        .bind(&entry_id)
        .bind(&endpoint_id)
        .fetch_all(&**pool).await;

    let template_rows = sqlx::query_as::<_, StorageAccessTemplateRow>("SELECT storage_access_templates.id, storage_access_templates.name FROM storage_access_templates LEFT JOIN storage_access_template_entries ON storage_access_template_entries.template_id = storage_access_templates.id WHERE storage_access_template_entries.entry_endpoint_id = $1 AND storage_access_template_entries.entry_id = $2")
        .bind(&endpoint_id)
        .bind(&entry_id)
        .fetch_all(&**pool).await;

    match rule_rows {
        Ok(rule_rows) => {
            let rules = rule_rows
                .iter()
                .map(|rule| StorageAccessRule {
                    access_type: rule.access_type.clone(),
                    action: rule.action.clone(),
                    executor_type: rule.executor_type.clone(),
                    executor_id: rule.executor_id,
                    executor_name: match rule.executor_type.as_str() {
                        // TODO define these constants somewhere. This is bug prone
                        "user" => rule.user_executor_name.clone(),
                        "user_group" => rule.group_executor_name.clone(),
                        _ => None,
                    },
                })
                .collect::<Vec<StorageAccessRule>>();

            match template_rows {
                Ok(template_rows) => {
                    return HttpResponse::Ok().json(web::Json(StorageAccessRulesOutput {
                        rules,
                        templates: template_rows,
                    }));
                }
                Err(err) => {
                    error!(
                        "(storage -> get_access_rules) Error returned from the database for templates. {}",
                        err
                    );
                    return error("storage.get_access_rules.error");
                }
            }
        }
        Err(err) => {
            error!(
                "(storage -> get_access_rules) Error returned from the database for custom rules. {}",
                err
            );
            return error("storage.get_access_rules.error");
        }
    }
}
