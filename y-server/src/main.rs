mod api;
mod db;
mod request;
mod user;
mod util;

use actix_web::{web, App, HttpServer};
use dotenvy::dotenv;
use std::env;
use std::process::exit;
use util::RequestPool;

async fn process_cli_arguments(pool: &RequestPool) {
    let cli_arguments: Vec<String> = env::args().collect();

    for (index, argument) in cli_arguments.iter().enumerate() {
        if argument == "--create-admin" {
            let username = &cli_arguments.get(index + 1);
            let password = &cli_arguments.get(index + 2);

            if let (Some(username), Some(password)) = (username, password) {
                println!("Creating an admin user '{}' and exiting...", username);

                let create_admin = util::cli_create_admin(pool, username, password).await;

                match create_admin {
                    Ok(_) => {
                        println!("Admin user created successfully.");
                        exit(0);
                    }
                    Err(error) => {
                        println!("Error creating an admin user: {}", error);
                        exit(1);
                    }
                }
            } else {
                println!("Error: --create-admin requires two arguments: username and password.");
                exit(1);
            }
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let pool = db::connect_to_database().await;

    process_cli_arguments(&pool).await;

    let server_address =
        env::var("SERVER_ADDRESS").expect("SERVER_ADDRESS env variable must be set");

    let server_port: u16 = env::var("SERVER_PORT")
        .expect("SERVER_PORT env variable must be set")
        .parse()
        .expect("SERVER_PORT is not a valid port number");

    println!(
        "Starting the server on {}:{}...",
        server_address, server_port
    );

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(
                web::scope("/api/auth")
                    .service(crate::api::auth::login::login)
                    .service(crate::api::auth::me::me)
                    .service(crate::api::auth::logout::logout),
            )
            .service(
                web::scope("/api/admin")
                    .service(crate::api::admin::users::users)
                    .service(crate::api::admin::update_password::update_password),
            )
    })
    .bind((server_address, server_port))?
    .run()
    .await
}
