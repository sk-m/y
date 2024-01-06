mod api;
mod db;
mod request;
mod right;
mod user;
mod user_group;
mod util;

use actix_web::{web, App, HttpServer};
use dotenvy::dotenv;
use std::env;
use std::process::exit;
use util::RequestPool;

async fn process_cli_arguments(pool: &RequestPool) {
    let cli_arguments: Vec<String> = env::args().collect();

    for (index, argument) in cli_arguments.iter().enumerate() {
        if argument == "--create-user" {
            let username = &cli_arguments.get(index + 1);
            let password = &cli_arguments.get(index + 2);
            let group_name = &cli_arguments.get(index + 3);

            if let (Some(username), Some(password)) = (username, password) {
                println!("Creating a new user and exiting...");

                let create_user = util::cli_create_user(
                    pool,
                    username,
                    password,
                    group_name.and_then(|name| Some(name.as_str())),
                )
                .await;

                match create_user {
                    Ok(_) => {
                        println!("No errors reported.");
                        exit(0);
                    }
                    Err(error) => {
                        println!("Error reported: {}", error);
                        exit(1);
                    }
                }
            } else {
                println!("Usage: --create-user <username> <password> [group]");
                println!("  group: optional, name of the group that will be assigned to the user.");
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
                    .service(crate::api::admin::user::user)
                    .service(crate::api::admin::create_user::create_user)
                    .service(crate::api::admin::delete_user::delete_user)
                    .service(crate::api::admin::users::users)
                    .service(crate::api::admin::update_password::update_password)
                    .service(crate::api::admin::user_groups::user_groups)
                    .service(crate::api::admin::user_group::user_group)
                    .service(crate::api::admin::update_user_group::update_user_group)
                    .service(crate::api::admin::create_user_group::create_user_group)
                    .service(crate::api::admin::delete_user_group::delete_user_group)
                    .service(crate::api::admin::update_user_group_membership::update_user_group_membership)
                    ,
            )
            .service(web::scope("/api").service(crate::api::user_rights::user_rights))
    })
    .bind((server_address, server_port))?
    .run()
    .await
}
