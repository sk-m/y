use crate::request::error;
use crate::user::get_client_rights;
use crate::util::RequestPool;
use actix_web::{put, web, HttpResponse, Responder};
use serde::Deserialize;

#[derive(Deserialize)]
struct UpdateFeatureInput {
    enabled: bool,
}

#[put("/features/{feature_name}")]
async fn update_feature(
    pool: web::Data<RequestPool>,
    form: web::Json<UpdateFeatureInput>,
    path: web::Path<String>,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let client_rights = get_client_rights(&pool, &req).await;

    let action_allowed = client_rights
        .iter()
        .find(|right| right.right_name.eq("update_features"))
        .is_some();

    if !action_allowed {
        return error("update_feature.unauthorized");
    }

    let form = form.into_inner();
    let target_feature = path.into_inner();
    let enabled = form.enabled;

    let result = sqlx::query("INSERT INTO features (feature, enabled) VALUES ($1, $2) ON CONFLICT (feature) DO UPDATE SET enabled = $2")
        .bind(target_feature)
        .bind(enabled)
        .bind(enabled)
        .execute(&**pool)
        .await;

    match result {
        Ok(result) => {
            if result.rows_affected() == 1 {
                return HttpResponse::Ok().body("{}");
            } else {
                return error("update_feature.user_not_found");
            }
        }
        Err(_) => {
            return error("update_feature.other");
        }
    }
}
