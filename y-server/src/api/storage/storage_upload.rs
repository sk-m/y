use std::collections::HashMap;

use actix_multipart::Multipart;
use actix_web::{post, web::Query, HttpResponse, Responder};
use futures::StreamExt;
use serde::Deserialize;

use crate::request::error;

#[derive(Deserialize)]
struct QueryParams {
    files_n: Option<usize>,
}

#[post("/upload")]
async fn storage_upload(query: Query<QueryParams>, mut payload: Multipart) -> impl Responder {
    let files_n = query.files_n;

    let mut folder_ids: HashMap<String, i32> = HashMap::new();

    let mut file_paths: Vec<String> = Vec::new();
    if files_n.is_some() {
        let files_n = files_n.unwrap();

        if files_n < 1000 {
            file_paths.reserve(files_n);
        }
    }

    while let Some(item) = payload.next().await {
        if let Ok(mut field) = item {
            let file_filename = field.content_disposition().get_filename();

            if let Some(file_filename) = file_filename {
                println!("{}: {} \n", field.name(), file_filename);
            } else {
                return error("storage.upload.no_filename");
            }

            // while let Some(chunk) = field.next().await {
            //     if let Ok(chunk) = chunk {
            //         // println!("-- CHUNK! \n");
            //     } else {
            //         println!("could not unwrap a chunk");
            //     }
            // }
        } else {
            println!("could not unwrap a field");
        }
    }

    HttpResponse::Ok().body("{}")
}
