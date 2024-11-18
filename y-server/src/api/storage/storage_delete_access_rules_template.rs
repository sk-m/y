use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{delete, web, HttpResponse, Responder};
use serde::Deserialize;

#[derive(Deserialize)]
struct DeleteTemplatesInput {
    template_ids: Vec<i32>,
}

#[delete("/access-rules/templates")]
async fn storage_delete_access_rules_template(
    pool: web::Data<RequestPool>,
    form: web::Json<DeleteTemplatesInput>,
    req: actix_web::HttpRequest,
) -> impl Responder {
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
        return error("storage.access_denied");
    }

    let template_ids = form.into_inner().template_ids;

    let delete_templates_result =
        sqlx::query("DELETE FROM storage_access_templates WHERE id = ANY($1)")
            .bind(template_ids)
            .execute(&**pool)
            .await;

    if delete_templates_result.is_err() {
        return error("storage.internal");
    } else {
        return HttpResponse::Ok().body("{}");
    }
}
