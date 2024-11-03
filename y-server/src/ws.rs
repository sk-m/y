use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::AggregatedMessage;
use rand::Rng;
use serde::Serialize;
use serde_json::json;

use crate::{user::get_user_from_request, util::RequestPool};

pub struct WSStorageLocation {
    pub endpoint_id: i32,
    pub folder_id: Option<i64>,
}

pub enum WSSessionLocation {
    Storage(WSStorageLocation),
    None,
}

#[allow(dead_code)]
pub struct WSSession {
    pub user_id: Option<i32>,
    pub user_session_id: Option<i32>,

    pub location: WSSessionLocation,

    pub ws_session: actix_ws::Session,
}

// TODO consider creating a wrapper over this (so you don't have to .lock() every time)
pub struct WSState {
    pub ws_connections: HashMap<usize, WSSession>,
}

impl WSState {
    pub async fn send_storage_location_updated(
        &mut self,
        executor_user_id: Option<i32>,
        endpoint_id: i32,
        folder_ids: Vec<Option<i64>>,
        invalidate_entries: bool,
        invalidate_thumbs: bool,
    ) -> u32 {
        let mut receivers = 0;

        for session in self.ws_connections.values_mut() {
            // Don't notify the executor
            // TODO bug-prone check. Won't work how we expect for anonymous clients.
            if session.user_id.is_none()
                || executor_user_id.is_none()
                || (session.user_id.is_some() && session.user_id != executor_user_id)
            {
                if let WSSessionLocation::Storage(location) = &session.location {
                    if location.endpoint_id == endpoint_id
                        && folder_ids.contains(&location.folder_id)
                    {
                        // TODO maybe just send the "storage_location_updated" message
                        // without any payload? If we are sending the message, it already
                        // menas that the user is currently in one of the target folders,
                        // so there is no reason to check it again on the client side -
                        // that check will always be true.
                        let result = session
                            .ws_session
                            .text(
                                json!(
                                    {
                                        "type": "storage_location_updated",
                                        "payload": {
                                            "endpoint_id": endpoint_id,
                                            "folder_id": location.folder_id,
                                            "invalidate_entries": invalidate_entries,
                                            "invalidate_thumbs": invalidate_thumbs
                                        }
                                    }
                                )
                                .to_string(),
                            )
                            .await;

                        if result.is_ok() {
                            receivers += 1;
                        }
                    }
                }
            }
        }

        receivers
    }
}

#[derive(Serialize)]
struct WSResponse {
    #[serde(rename = "type")]
    response_type: String,
}

impl WSResponse {
    pub fn ok() -> String {
        serde_json::to_string(&WSResponse {
            response_type: "ok".to_string(),
        })
        .unwrap()
    }

    pub fn error() -> String {
        serde_json::to_string(&WSResponse {
            response_type: "error".to_string(),
        })
        .unwrap()
    }
}

pub async fn ws(
    req: HttpRequest,
    stream: web::Payload,
    pool: web::Data<RequestPool>,
    data: web::Data<Mutex<WSState>>,
) -> Result<HttpResponse, Error> {
    let (res, mut session, stream) = actix_ws::handle(&req, stream)?;

    let session_info = get_user_from_request(&pool, &req).await;

    let mut stream = stream
        .aggregate_continuations()
        .max_continuation_size(2_usize.pow(20));

    let ws_session_id = rand::thread_rng().gen::<usize>();

    let mut ws_state = data.lock().unwrap();

    if let Some((user, user_session)) = session_info {
        ws_state.ws_connections.insert(
            ws_session_id,
            WSSession {
                user_id: Some(user.id),
                user_session_id: Some(user_session.id),

                location: WSSessionLocation::None,

                ws_session: session.clone(),
            },
        );
    } else {
        ws_state.ws_connections.insert(
            ws_session_id,
            WSSession {
                user_id: None,
                user_session_id: None,

                location: WSSessionLocation::None,

                ws_session: session.clone(),
            },
        );
    }

    let alive = Arc::new(Mutex::new(Instant::now()));
    let mut session2 = session.clone();
    let alive2 = alive.clone();

    // Heartbeat task
    actix_web::rt::spawn(async move {
        let mut interval = actix_web::rt::time::interval(Duration::from_secs(5));

        loop {
            interval.tick().await;

            if session2.ping(b"").await.is_err() {
                break;
            }

            if Instant::now().duration_since(*alive2.lock().unwrap()) > Duration::from_secs(10) {
                let _ = session2.close(None).await;
                break;
            }
        }
    });

    let data2 = data.clone();

    // Receive task
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = stream.recv().await {
            match msg {
                AggregatedMessage::Ping(bytes) => {
                    if session.pong(&bytes).await.is_err() {
                        return;
                    }
                }

                AggregatedMessage::Pong(_) => {
                    *alive.lock().unwrap() = Instant::now();
                }

                AggregatedMessage::Close(reason) => {
                    let _ = session.close(reason).await;
                    return;
                }

                // TODO json instead of proprientary request format?
                AggregatedMessage::Text(msg) => {
                    let mut msg_parts = msg.split(';');

                    let action = msg_parts.next();

                    match action {
                        Some("set_location") => {
                            let location_type = msg_parts.next();

                            match location_type {
                                Some("storage") => {
                                    let endpoint_id =
                                        msg_parts.next().and_then(|id| id.parse::<i32>().ok());

                                    if endpoint_id.is_some() {
                                        let folder_id =
                                            msg_parts.next().and_then(|id| id.parse::<i64>().ok());

                                        let mut ws_state = data2.lock().unwrap();
                                        let ws_conn_info = ws_state
                                            .ws_connections
                                            .get_mut(&ws_session_id)
                                            .unwrap();

                                        ws_conn_info.location =
                                            WSSessionLocation::Storage(WSStorageLocation {
                                                endpoint_id: endpoint_id.unwrap(),
                                                folder_id,
                                            });

                                        session.text(WSResponse::ok()).await.unwrap();
                                    } else {
                                        session.text(WSResponse::error()).await.unwrap();
                                    }
                                }

                                _ => {
                                    session.text(WSResponse::error()).await.unwrap();
                                }
                            }
                        }

                        _ => {
                            session.text(WSResponse::error()).await.unwrap();
                        }
                    }
                }

                _ => (),
            };
        }

        let _ = session.close(None).await;
    });

    // respond immediately with response connected to WS session
    Ok(res)
}
