mod api;
mod config;
mod db;
mod request;
mod right;
mod storage_access;
mod storage_archives;
mod storage_endpoint;
mod storage_entry;
mod user;
mod user_group;
mod util;
mod vfs;

use crate::storage_archives::cleanup_storage_archives;
use actix_web::{web, App, HttpServer};
use chrono::{FixedOffset, Local};
use dotenvy::dotenv;
use futures::TryFutureExt;
use log::*;
use simplelog::*;
use std::path::Path;
use std::process::exit;
use std::{env, fs};
use std::{str::FromStr, time::Duration};
use users::{get_current_gid, get_current_uid};
use util::RequestPool;
use vfs::vfs_mount;

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
                        println!("No errors reported");
                        exit(0);
                    }
                    Err(error) => {
                        println!("{}", error);
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

fn setup_job_scheduler(pool: RequestPool) {
    actix_rt::spawn(async move {
        // At 0 minutes past the hour, every 12 hours
        let schedule = cron::Schedule::from_str("0 0 0/12 * * * *").unwrap();
        let offset = FixedOffset::east_opt(0).unwrap();

        loop {
            let mut upcoming = schedule.upcoming(offset).take(1);
            actix_rt::time::sleep(Duration::from_secs(30)).await;

            let local = &Local::now();

            if let Some(datetime) = upcoming.next() {
                if datetime.timestamp() <= local.timestamp() {
                    cleanup_storage_archives(&pool).await;
                }
            }
        }
    });
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load the .env file
    dotenv().ok();

    // Initialize the logger
    CombinedLogger::init(vec![
        TermLogger::new(
            // LevelFilter::Info,
            LevelFilter::Debug,
            Config::default(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
        WriteLogger::new(
            LevelFilter::Info,
            Config::default(),
            std::fs::File::create("y-server.log").unwrap(),
        ),
    ])
    .unwrap();

    // Connect to the database
    let pool = db::connect().await;

    let fs = vfs_mount(
        1,
        "/mnt/test",
        // TODO! do not pool.clone() !!!
        pool.clone(),
        (get_current_uid(), get_current_gid()),
    );

    // Process command line arguments. We might want to do something and terminate
    process_cli_arguments(&pool).await;

    // Make sure the server address and port are set by the user
    let server_address =
        env::var("SERVER_ADDRESS").expect("SERVER_ADDRESS env variable must be set");

    let server_port: u16 = env::var("SERVER_PORT")
        .expect("SERVER_PORT env variable must be set")
        .parse()
        .expect("SERVER_PORT is not a valid port number");

    // Run migrations
    let migration_result = sqlx::migrate!().run(&pool).await;

    match migration_result {
        Ok(_) => {
            info!("Migrations ran successfully")
        }
        Err(error) => {
            error!("Error running migrations. {}", error);
            exit(1);
        }
    }

    // Make sure the environment is set up correctly
    let upload_staging_folder = Path::new("upload_staging");

    if !upload_staging_folder.exists() {
        fs::create_dir(upload_staging_folder).unwrap();
    }

    // Start up the job scheduler
    info!("Setting up the job scheduler");

    // TODO! do not pool.clone() !!!
    let jobs_database_pool = pool.clone();
    setup_job_scheduler(jobs_database_pool);

    // Start actix web
    info!("Starting server on {}:{}", server_address, server_port);

    HttpServer::new(move || {
        App::new()
            // TODO! do not pool.clone() !!!
            .app_data(web::Data::new(pool.clone()))
            .service(
                web::scope("/api/auth")
                    .service(crate::api::auth::login::login)
                    .service(crate::api::auth::me::me)
                    .service(crate::api::auth::logout::logout),
            )
            .service(
                web::scope("/api/storage")
                    .service(crate::api::storage::storage_upload::storage_upload)
                    .service(crate::api::storage::storage_endpoints::storage_endpoints)
                    .service(crate::api::storage::storage_locations::storage_locations)
                    .service(crate::api::storage::storage_entries::storage_entries)
                    .service(crate::api::storage::storage_download::storage_download)
                    .service(crate::api::storage::storage_download_zip::storage_download_zip)
                    .service(crate::api::storage::storage_create_folder::storage_create_folder)
                    .service(crate::api::storage::storage_get_folder_path::storage_get_folder_path)
                    .service(crate::api::storage::storage_delete_entries::storage_delete_entries)
                    .service(crate::api::storage::storage_entry_thumbnails::storage_entry_thumbnails)
                    .service(crate::api::storage::storage_move_entries::storage_move_entries)
                    .service(crate::api::storage::storage_rename_entry::storage_rename_entry)
                    .service(crate::api::storage::storage_get::storage_get)
                    .service(crate::api::storage::storage_create_access_rules::storage_create_access_rules)
                    .service(crate::api::storage::storage_create_access_rules_template::storage_create_access_rules_template)
                    .service(crate::api::storage::storage_entry_add_access_rules_template::storage_entry_add_access_rules_template)
                    .service(crate::api::storage::storage_entry_remove_access_rules_template::storage_entry_remove_access_rules_template)
                    .service(crate::api::storage::storage_access_rules_templates::storage_access_rules_templates)
                    .service(crate::api::storage::storage_get_access_rules::storage_get_access_rules)
                    .service(crate::api::storage::storage_delete_access_rules_template::storage_delete_access_rules_template)
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
                    .service(crate::api::admin::features::features)
                    .service(crate::api::admin::update_feature::update_feature)
                    .service(crate::api::admin::create_storage_endpoint::create_storage_endpoint)
                    .service(crate::api::admin::create_storage_location::create_storage_location)
                    .service(crate::api::admin::delete_storage_location::delete_storage_location)
                    .service(crate::api::admin::storage_endpoints::storage_enpoints)
                    .service(crate::api::admin::storage_endpoint::storage_enpoint)
                    .service(crate::api::admin::update_storage_endpoint::update_storage_endpoint)
                    .service(crate::api::admin::config::config_options::config_options)
                    .service(crate::api::admin::config::config_set::config_set)
                    ,
            )
            .service(
                web::scope("/api")
                    .service(crate::api::user_rights::user_rights)
                    .service(crate::api::instance_config::instance_config)
            )
    })
    .bind((server_address, server_port))?
    .run()
    .and_then(|_| async {
        info!("Server stopped");

        info!("Unmounting virtual file system");
        fs.join();

        Ok(())
    })
    .await
}
