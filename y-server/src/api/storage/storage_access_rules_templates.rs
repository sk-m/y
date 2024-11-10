use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use sqlx::prelude::FromRow;

use crate::request::{error, TableInput};
use futures::join;

use crate::util::RequestPool;

#[derive(Serialize, FromRow)]
struct TemplateOutput {
    id: i32,
    name: String,
}

#[derive(Serialize)]
struct TemplatesOutput {
    templates: Vec<TemplateOutput>,
    total_count: i64,
}

#[get("/access-rules/templates")]
async fn storage_access_rules_templates(
    pool: web::Data<RequestPool>,
    query: web::Query<TableInput>,
) -> impl Responder {
    let search = query.search.clone().unwrap_or("".to_string());

    let order_by = match query.order_by.as_ref() {
        Some(order_by) => match order_by.as_str() {
            "name" => "name",
            _ => "name",
        },
        None => "name",
    };

    let sql = format!(
        "SELECT * FROM storage_access_templates WHERE {}",
        query.get_where_sql("name", order_by)
    );

    let templates = sqlx::query_as::<_, TemplateOutput>(sql.as_str())
        .bind(search)
        .fetch_all(&**pool);

    let templates_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM storage_access_templates")
            .fetch_one(&**pool);

    let (templates, templates_count) = join!(templates, templates_count);

    match templates {
        Ok(templates) => {
            let templates_out = templates
                .iter()
                .map(|template| TemplateOutput {
                    id: template.id,
                    name: template.name.clone(),
                })
                .collect::<Vec<TemplateOutput>>();

            return HttpResponse::Ok().json(web::Json(TemplatesOutput {
                templates: templates_out,
                total_count: templates_count.unwrap_or(0),
            }));
        }
        Err(_) => {
            return error("storage.internal");
        }
    }
}
