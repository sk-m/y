use actix_multipart::Multipart;
use actix_web::{post, HttpResponse, Responder};
use futures_util::StreamExt as _;

#[post("/upload")]
async fn storage_upload(mut payload: Multipart) -> impl Responder {
    while let Some(item) = payload.next().await {
        if let Ok(mut field) = item {
            while let Some(chunk) = field.next().await {
                if let Ok(chunk) = chunk {
                    println!("-- CHUNK: \n{:?}", std::str::from_utf8(&chunk));
                } else {
                    println!("could not unwrap a chunk");
                }
            }
        } else {
            println!("could not unwrap a field");
        }
    }

    HttpResponse::Ok().body("{}")
}
