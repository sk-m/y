use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{delete, web, HttpResponse, Responder};

#[delete("/storage/locations/{location_id}")]
async fn delete_storage_location(
    pool: web::Data<RequestPool>,
    path: web::Path<i32>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let location_id = path.into_inner();

    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("manage_storage_locations"))
        .is_some();

    if !action_allowed {
        return error("delete_storage_location.unauthorized");
    }

    let delete_location_result = sqlx::query("DELETE FROM storage_locations WHERE id = $1")
        .bind(location_id)
        .execute(&**pool)
        .await;

    if delete_location_result.is_err() {
        return error("delete_storage_location.other");
    }

    HttpResponse::Ok().body("{}")
}
