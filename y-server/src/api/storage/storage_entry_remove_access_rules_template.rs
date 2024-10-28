use actix_web::{delete, web, HttpResponse, Responder};
use log::*;

use crate::{
    request::error,
    storage_access::check_storage_entry_access,
    user::{get_client_rights, get_user_from_request, get_user_groups},
    util::RequestPool,
};

#[delete("/access-rules/{endpoint_id}/{entry_id}/template/{template_id}")]
async fn storage_entry_remove_access_rules_template(
    pool: web::Data<RequestPool>,
    path: web::Path<(i32, i64, i32)>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let (endpoint_id, entry_id, template_id) = path.into_inner();

    let client_rights = get_client_rights(&pool, &req).await;

    let manage_access_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "storage_manage_access");

    if !manage_access_allowed {
        return error("storage.entry_remove_rules_template.unauthorized");
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
        return error("storage.entry_remove_rules_template.unauthorized");
    }

    let delete_result =
        sqlx::query("DELETE FROM public.storage_access_template_entries WHERE entry_endpoint_id = $1 AND entry_id = $2 AND template_id = $3")
            .bind(&endpoint_id)
            .bind(&entry_id)
            .bind(&template_id)
            .execute(&**pool)
            .await;

    match delete_result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(err) => {
            error!("{}", err);
            error("storage.entry_remove_rules_template.other")
        }
    }
}
