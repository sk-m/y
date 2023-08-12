use crate::schema::user_sessions;
use chrono::NaiveDateTime as Timestamp;
use diesel::prelude::*;
use uuid::Uuid;

#[derive(Queryable, Selectable)]
#[diesel(table_name = user_sessions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserSession {
    pub id: i32,
    pub session_id: Uuid,
    pub session_key: String,
    pub user_id: i32,
    pub created_at: Timestamp,
    pub expires_on: Option<Timestamp>,
}

#[derive(Insertable)]
#[diesel(table_name = user_sessions)]
pub struct NewUserSession {
    pub session_id: Uuid,
    pub session_key: String,
    pub user_id: i32,
    pub created_at: Timestamp,
    pub expires_on: Option<Timestamp>,
}
