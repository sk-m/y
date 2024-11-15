use actix_web::{put, web, HttpResponse, Responder};

use crate::{
    request::error,
    storage_access::check_storage_entry_access,
    user::{get_client_rights, get_user_from_request, get_user_groups},
    util::RequestPool,
};

#[put("/access-rules/{endpoint_id}/{entry_id}/template/{template_id}")]
async fn storage_entry_add_access_rules_template(
    pool: web::Data<RequestPool>,
    req: actix_web::HttpRequest,
    path: web::Path<(i32, i64, i32)>,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let manage_access_allowed = client_rights
        .iter()
        .any(|right| right.right_name == "storage_manage_access");

    if !manage_access_allowed {
        return error("storage.access_denied");
    }

    let (endpoint_id, entry_id, template_id) = path.into_inner();

    let client = get_user_from_request(&**pool, &req).await;

    let entry_action_allowed = if let Some((client_user, _)) = client {
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

    if !entry_action_allowed {
        return error("storage.access_denied");
    }

    let append_template_result  = sqlx::query(
            "INSERT INTO public.storage_access_template_entries(entry_endpoint_id, entry_id, template_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        )
        .bind(endpoint_id)
        .bind(entry_id)
        .bind(template_id)
        .execute(&**pool)
        .await;

    match append_template_result {
        Ok(_) => HttpResponse::Ok().body("{}"),
        Err(_) => error("storage.internal"),
    }
}
