use serde::Serialize;
use sqlx::FromRow;

use crate::{user::UserError, util::RequestPool};

#[derive(FromRow, Serialize, Debug)]
pub struct UserGroup {
    pub id: i32,
    pub name: String,
    pub group_type: Option<String>,
}

#[derive(Serialize)]
pub struct UserGroupRight {
    pub group_id: i32,
    pub right_name: String,
    pub right_options: serde_json::Value,
}

pub struct UserGroupWithRights {
    pub id: i32,
    pub name: String,
    pub group_type: Option<String>,
    pub rights: Vec<UserGroupRight>,
}

#[derive(FromRow)]
struct UserGroupAndRights {
    pub id: i32,
    pub name: String,
    pub group_type: Option<String>,
    pub right_name: Option<String>,
    pub right_options: Option<serde_json::Value>,
}

pub async fn get_user_group(
    pool: &RequestPool,
    user_group_id: i32,
) -> Result<UserGroupWithRights, UserError> {
    let group_and_rights = sqlx::query_as::<_, UserGroupAndRights>(
        "SELECT user_groups.id, user_groups.name, user_groups.group_type, user_group_rights.right_name, user_group_rights.right_options FROM user_groups LEFT JOIN user_group_rights ON user_group_rights.group_id = user_groups.id WHERE user_groups.id = $1"
    )
    .bind(user_group_id)
    .fetch_all(pool).await;

    match group_and_rights {
        Ok(group_and_rights) => {
            if group_and_rights.len() == 0 {
                return Err(UserError::GroupNotFound);
            }

            let group_id = group_and_rights[0].id.clone();
            let group_name = group_and_rights[0].name.clone();
            let group_type = group_and_rights[0].group_type.clone();

            let mut rights: Vec<UserGroupRight> = vec![];

            for group_and_right in group_and_rights {
                if group_and_right.right_name.is_some() {
                    rights.push(UserGroupRight {
                        group_id: group_and_right.id,
                        right_name: group_and_right.right_name.unwrap(),
                        right_options: group_and_right.right_options.unwrap(),
                    });
                }
            }

            return Ok(UserGroupWithRights {
                id: group_id,
                name: group_name,
                group_type,
                rights,
            });
        }
        Err(_) => return Err(UserError::Internal),
    };
}
