use actix_web::HttpRequest;
use chrono::NaiveDateTime as Timestamp;
use chrono::Utc;
use serde_json::Value;
use uuid::Uuid;

use crate::user_group::UserGroup;
use crate::util::RequestPool;
use log::*;

pub enum UserError {
    GroupNotFound,

    Internal,
}

#[derive(sqlx::FromRow)]
pub struct User {
    pub id: i32,

    pub username: String,
    pub password: Option<String>,

    pub created_at: Timestamp,
}

#[allow(dead_code)]
#[derive(sqlx::FromRow)]
pub struct UserSession {
    pub id: i32,

    pub session_id: Uuid,
    pub session_key: String,

    pub user_id: i32,

    pub created_at: Timestamp,
    pub expires_on: Option<Timestamp>,
}

fn generate_session_secrets() -> (Uuid, String) {
    use rand::distributions::Alphanumeric;
    use rand::{thread_rng, Rng};

    let session_key: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(256)
        .map(char::from)
        .collect();

    let session_id = Uuid::new_v4();

    (session_id, session_key)
}

pub async fn create_user_session(
    pool: &RequestPool,
    user_id: i32,
) -> Result<UserSession, sqlx::Error> {
    use chrono::prelude::*;

    let (session_id, session_key) = generate_session_secrets();

    let created_at = Utc::now();
    let expires_on = created_at + chrono::Duration::days(30);

    sqlx::query_as::<_, UserSession>(
        "INSERT INTO user_sessions (session_id, session_key, user_id, created_at, expires_on) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    )
        .bind(session_id)
        .bind(session_key)
        .bind(user_id)
        .bind(created_at.naive_utc())
        .bind(expires_on.naive_utc())
        .fetch_one(pool)
        .await
}

#[derive(sqlx::FromRow)]
struct UserWithSession {
    pub id: i32,

    pub user_id: i32,
    pub username: String,
    pub user_created_at: Timestamp,

    pub session_id: Uuid,
    pub session_key: String,
    pub session_created_at: Timestamp,
    pub session_expires_on: Option<Timestamp>,
}

pub async fn get_user_from_request(
    pool: &RequestPool,
    req: &HttpRequest,
) -> Option<(User, UserSession)> {
    let session_cookie = req.cookie("y-session");

    if let Some(session_cookie) = session_cookie {
        let cookie_value = session_cookie.value();
        let cookie_parts: Vec<&str> = cookie_value.split(':').collect();

        if cookie_parts.len() == 2 {
            let (session_id, session_key) = (Uuid::parse_str(cookie_parts[0]), cookie_parts[1]);

            if let Ok(session_id) = session_id {
                let user_with_session = sqlx::query_as::<_, UserWithSession>(
                    "SELECT user_sessions.id, user_sessions.session_id, user_sessions.session_key, user_sessions.user_id, user_sessions.created_at as session_created_at, user_sessions.expires_on as session_expires_on, users.username, users.created_at as user_created_at FROM user_sessions INNER JOIN users ON user_sessions.user_id = users.id WHERE user_sessions.session_id = $1 AND user_sessions.session_key = $2"
                )
                .bind(session_id)
                .bind(session_key)
                .fetch_one(pool)
                .await;

                if let Ok(user_with_session) = user_with_session {
                    if let Some(expires_on) = user_with_session.session_expires_on {
                        if Utc::now().naive_utc() > expires_on {
                            return None;
                        }
                    }

                    return Some((
                        User {
                            created_at: user_with_session.user_created_at,
                            id: user_with_session.user_id,
                            password: None,
                            username: user_with_session.username,
                        },
                        UserSession {
                            id: user_with_session.id,
                            created_at: user_with_session.session_created_at,
                            expires_on: user_with_session.session_expires_on,
                            session_id: user_with_session.session_id,
                            session_key: user_with_session.session_key,
                            user_id: user_with_session.user_id,
                        },
                    ));
                }
            }
        }
    }

    None
}

pub async fn destroy_user_session(pool: &RequestPool, session_id: Uuid) -> bool {
    let result = sqlx::query("DELETE FROM user_sessions WHERE session_id = $1")
        .bind(session_id)
        .execute(pool)
        .await;

    result.is_ok() && result.unwrap().rows_affected() == 1
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct UserRight {
    pub right_name: String,
    pub right_options: Value,
}

pub async fn get_group_rights(pool: &RequestPool, group_ids: &Vec<i32>) -> Vec<UserRight> {
    // TODO refactor the query
    let right_rows = sqlx::query_as::<_, UserRight>("SELECT DISTINCT ON (user_group_rights.right_name, user_group_rights.right_options) user_group_rights.right_name, user_group_rights.right_options FROM user_groups
    RIGHT JOIN user_group_rights ON user_group_rights.group_id = user_groups.id
    WHERE user_groups.group_type IN ('user', 'everyone')
    UNION ALL
    SELECT DISTINCT ON (user_group_rights.right_name, user_group_rights.right_options) user_group_rights.right_name, user_group_rights.right_options FROM user_groups
    RIGHT JOIN user_group_rights ON user_group_rights.group_id = user_groups.id
    WHERE user_groups.id = ANY($1)")
        .bind(&group_ids)
        .fetch_all(pool)
        .await;

    match right_rows {
        Ok(right_rows) => {
            return right_rows;
        }
        Err(err) => {
            error!(
                "(user -> get_group_rights) Error returned from the database. {}",
                err
            );
            return vec![];
        }
    }
}

pub async fn get_client_rights(pool: &RequestPool, req: &HttpRequest) -> Vec<UserRight> {
    let client_session = get_user_from_request(&pool, &req).await;

    // ! TODO refactor the query
    let right_rows = if let Some((user, _)) = client_session {
        sqlx::query_as::<_, UserRight>("SELECT DISTINCT ON (user_group_rights.right_name, user_group_rights.right_options) user_group_rights.right_name, user_group_rights.right_options FROM user_groups
        RIGHT JOIN user_group_rights ON user_group_rights.group_id = user_groups.id
        WHERE user_groups.group_type IN ('user', 'everyone')
    UNION ALL
    SELECT DISTINCT ON (user_group_rights.right_name, user_group_rights.right_options) user_group_rights.right_name, user_group_rights.right_options FROM user_groups
        RIGHT JOIN user_group_membership ON user_groups.id = user_group_membership.group_id
        RIGHT JOIN users ON user_group_membership.user_id = users.id
        RIGHT JOIN user_group_rights ON user_group_rights.group_id = user_group_membership.group_id
        WHERE users.id = $1")
            .bind(user.id)
            .fetch_all(pool)
            .await
    } else {
        sqlx::query_as::<_, UserRight>("SELECT DISTINCT ON (user_group_rights.right_name, user_group_rights.right_options) user_group_rights.right_name, user_group_rights.right_options FROM user_groups
        RIGHT JOIN user_group_rights ON user_group_rights.group_id = user_groups.id
        WHERE user_groups.group_type = 'everyone'")
            .fetch_all(pool)
            .await
    };

    match right_rows {
        Ok(right_rows) => {
            return right_rows;
        }
        Err(err) => {
            error!(
                "(user -> get_client_rights) Error returned from the database. {}",
                err
            );
            return vec![];
        }
    }
}

pub async fn get_user_groups(pool: &RequestPool, user_id: i32) -> Vec<UserGroup> {
    // TODO we do this `WHERE group_type IN ('everyone', 'user')` thing in multiple places. This is confusing and will 100% create bugs in the future.

    let groups = sqlx::query_as::<_, UserGroup>(
        "SELECT user_groups.id, user_groups.name, user_groups.group_type FROM user_groups
        RIGHT JOIN user_group_membership ON user_group_membership.group_id = user_groups.id
        WHERE user_group_membership.user_id = $1 UNION ALL SELECT user_groups.id, user_groups.name, user_groups.group_type FROM user_groups WHERE group_type IN ('everyone', 'user')",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await;

    match groups {
        Ok(groups) => {
            return groups;
        }
        Err(err) => {
            error!(
                "(user -> get_user_groups) Error returned from the database. {}",
                err
            );
            return vec![];
        }
    }
}
