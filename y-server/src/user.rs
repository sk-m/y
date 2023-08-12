use actix_web::HttpRequest;
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::schema::user_sessions;

use crate::models::user_session::NewUserSession;
use crate::models::user_session::UserSession;

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

pub fn create_user_session(
    connection: &mut PgConnection,
    user_id: i32,
) -> Result<UserSession, diesel::result::Error> {
    use chrono::prelude::*;

    let (session_id, session_key) = generate_session_secrets();

    let created_at = Utc::now();
    let expires_on = created_at + chrono::Duration::days(30);

    let new_session = NewUserSession {
        session_id,
        session_key,

        user_id,

        created_at: created_at.naive_utc(),
        expires_on: Some(expires_on.naive_utc()),
    };

    diesel::insert_into(user_sessions::table)
        .values(&new_session)
        .get_result::<UserSession>(connection)
}

pub fn get_user_from_request(req: HttpRequest) -> Option<i32> {
    use crate::util::RequestPool;

    let session_cookie = req.cookie("y-session");

    if let Some(session_cookie) = session_cookie {
        let cookie_value = session_cookie.value();
        let cookie_parts: Vec<&str> = cookie_value.split(':').collect();

        if cookie_parts.len() == 2 {
            let (session_id, session_key) = (Uuid::parse_str(cookie_parts[0]), cookie_parts[1]);

            if let Ok(session_id) = session_id {
                let mut connection = req
                    .app_data::<RequestPool>()
                    .expect("Could not get a connection pool from the request.")
                    .get()
                    .expect("Could not get a connection from the pool.");

                let session = user_sessions::table
                    .filter(user_sessions::session_id.eq(session_id))
                    .filter(user_sessions::session_key.eq(session_key))
                    .limit(1)
                    .select(UserSession::as_select())
                    .load::<UserSession>(&mut connection);

                if let Ok(session) = session {
                    if let Some(session) = session.first() {
                        if let Some(expires_on) = session.expires_on {
                            if Utc::now().naive_utc() > expires_on {
                                return None;
                            }
                        }

                        return Some(session.user_id);
                    }
                }
            }
        }
    }

    None
}
