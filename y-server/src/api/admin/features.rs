use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

use crate::request::error;

use crate::util::RequestPool;

#[derive(Serialize)]
struct FeatureOutput {
    feature: String,
    enabled: bool,
}

#[derive(Serialize)]
struct FeaturesOutput {
    features: Vec<FeatureOutput>,
}

#[derive(sqlx::FromRow)]
struct FeatureRow {
    feature: String,
    enabled: bool,
}

#[get("/features")]
async fn features(pool: web::Data<RequestPool>) -> impl Responder {
    let feature_rows = sqlx::query_as::<_, FeatureRow>("SELECT feature, enabled FROM features")
        .fetch_all(&**pool)
        .await;

    match feature_rows {
        Ok(feature_rows) => {
            let features = feature_rows
                .iter()
                .map(|entry| FeatureOutput {
                    feature: entry.feature.clone(),
                    enabled: entry.enabled,
                })
                .collect::<Vec<FeatureOutput>>();

            return HttpResponse::Ok().json(web::Json(FeaturesOutput { features }));
        }
        Err(_) => {
            return error("features.internal");
        }
    }
}
