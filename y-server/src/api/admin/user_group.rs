use crate::user_group::get_user_group;
use crate::util::RequestPool;
use crate::{request::error, user_group::UserGroupRight};
use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

#[derive(Serialize)]
struct UserGroupOutput {
    pub id: i32,
    pub name: String,
    pub rights: Vec<UserGroupRight>,
}

#[get("/user-groups/{user_group_id}")]
async fn user_group(pool: web::Data<RequestPool>, path: web::Path<i32>) -> impl Responder {
    let user_group_id = path.into_inner();

    let user_group = get_user_group(&pool, user_group_id).await;

    match user_group {
        Ok(user_group) => {
            return HttpResponse::Ok().json(web::Json(UserGroupOutput {
                id: user_group.id,
                name: user_group.name,
                rights: user_group.rights,
            }));
        }
        Err(err) => {
            dbg!(err);
            return error("user_group.not_found");
        }
    }
}
