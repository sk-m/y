use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

use crate::request::{error, TableInput, DEFAULT_LIMIT};
use futures::join;

use crate::user_group::UserGroup;
use crate::util::RequestPool;

#[derive(Serialize)]
struct UserGroupOutput {
    id: i32,
    name: String,
}

#[derive(Serialize)]
struct UserGroupsOutput {
    user_groups: Vec<UserGroupOutput>,
    total_count: i64,
}

#[get("/user-groups")]
async fn user_groups(
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

    let user_groups = sqlx::query_as::<_, UserGroup>(
        "SELECT * FROM user_groups WHERE name LIKE '%' || $1 || '%' ORDER BY $2 LIMIT $3 OFFSET $4",
    )
    .bind(search)
    .bind(order_by)
    .bind(query.limit.unwrap_or(DEFAULT_LIMIT))
    .bind(query.skip.unwrap_or(0))
    .fetch_all(&**pool);

    let user_groups_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM user_groups").fetch_one(&**pool);

    let (user_groups, user_groups_count) = join!(user_groups, user_groups_count);

    if let Ok(groups) = user_groups {
        let groups_json = groups
            .iter()
            .map(|group| UserGroupOutput {
                id: group.id,
                name: group.name.clone(),
            })
            .collect::<Vec<UserGroupOutput>>();

        HttpResponse::Ok().json(web::Json(UserGroupsOutput {
            user_groups: groups_json,
            total_count: user_groups_count.unwrap_or(0),
        }))
    } else {
        error("user_groups.internal")
    }
}
