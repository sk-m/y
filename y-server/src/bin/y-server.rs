use scheduler::setup_job_scheduler;
use util::Y_VERSION;
use y_server::*;

use vfs_manager::{mount_vfs_endpoints, VFSState};
use ws::WSState;

use actix_web::{web, App, HttpServer};
use dotenvy::dotenv;
use futures::TryFutureExt;
use log::*;
use simplelog::*;
use std::collections::HashMap;
use std::path::Path;
use std::process::exit;
use std::sync::Mutex;
use std::{env, fs, io};

fn process_cli_arguments() {
    let cli_arguments: Vec<String> = env::args().collect();

    for (_, argument) in cli_arguments.iter().enumerate() {
        if argument == "-v" || argument == "--version" {
            println!("{}", Y_VERSION);
            exit(0);
        }
    }
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    // Process command line arguments. We might want to do something and exit
    process_cli_arguments();

    // Load the .env file
    dotenv().ok();

    // Initialize the logger
    let log_file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("y-server.log")
        .unwrap();

    let log_level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    CombinedLogger::init(vec![
        TermLogger::new(
            log_level,
            ConfigBuilder::new()
                .set_time_offset_to_local()
                .unwrap()
                .set_time_format_custom(format_description!("[hour]:[minute]:[second]"))
                .build(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
        WriteLogger::new(
            log_level,
            ConfigBuilder::new()
                .set_time_offset_to_local()
                .unwrap()
                .set_time_format_custom(format_description!(
                    "[day].[month].[year] [hour]:[minute]:[second]"
                ))
                .build(),
            log_file,
        ),
    ])
    .unwrap();

    // Connect to the database
    let mut pool = db::connect().await;

    // VFS
    let mut vfs_state = VFSState {
        handles: HashMap::new(),
    };

    let _ = mount_vfs_endpoints(&mut vfs_state, &mut pool).await;

    // Global websocket state
    let ws_state = web::Data::new(Mutex::new(WSState {
        ws_connections: HashMap::new(),
    }));

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

    setup_job_scheduler(pool.clone());

    // Start actix web
    info!("Starting server on {}:{}", server_address, server_port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::clone(&ws_state))
            .app_data(web::Data::new(pool.clone()))
            .route("/api/ws", web::get().to(ws::ws))
            .service(
                web::scope("/api/auth")
                    .service(api::auth::login::login)
                    .service(api::auth::me::me)
                    .service(api::auth::logout::logout),
            )
            .service(
                web::scope("/api/storage")
                    .service(api::storage::storage_upload::storage_upload)
                    .service(api::storage::storage_endpoints::storage_endpoints)
                    .service(api::storage::storage_locations::storage_locations)
                    .service(api::storage::storage_entries::storage_entries)
                    .service(api::storage::storage_download::storage_download)
                    .service(api::storage::storage_create_archive::storage_create_archive)
                    .service(api::storage::storage_create_folder::storage_create_folder)
                    .service(api::storage::storage_get_folder_path::storage_get_folder_path)
                    .service(api::storage::storage_delete_entries::storage_delete_entries)
                    .service(api::storage::storage_entry_thumbnails::storage_entry_thumbnails)
                    .service(api::storage::storage_move_entries::storage_move_entries)
                    .service(api::storage::storage_rename_entry::storage_rename_entry)
                    .service(api::storage::storage_get::storage_get)
                    .service(api::storage::storage_create_access_rules::storage_create_access_rules)
                    .service(api::storage::storage_create_access_rules_template::storage_create_access_rules_template)
                    .service(api::storage::storage_entry_add_access_rules_template::storage_entry_add_access_rules_template)
                    .service(api::storage::storage_entry_remove_access_rules_template::storage_entry_remove_access_rules_template)
                    .service(api::storage::storage_access_rules_templates::storage_access_rules_templates)
                    .service(api::storage::storage_get_access_rules::storage_get_access_rules)
                    .service(api::storage::storage_delete_access_rules_template::storage_delete_access_rules_template)
                    .service(api::storage::storage_user_pins::storage_user_pins)
                    .service(api::storage::storage_create_user_pin::storage_create_user_pin)
                    .service(api::storage::storage_delete_user_pin::storage_delete_user_pin)
                    .service(api::storage::storage_user_archives::storage_user_archives)
                    .service(api::storage::storage_download_archive::storage_download_archive),
            )
            .service(
                web::scope("/api/admin")
                    .service(api::admin::user::user)
                    .service(api::admin::create_user::create_user)
                    .service(api::admin::delete_user::delete_user)
                    .service(api::admin::users::users)
                    .service(api::admin::update_password::update_password)
                    .service(api::admin::user_groups::user_groups)
                    .service(api::admin::user_group::user_group)
                    .service(api::admin::update_user_group::update_user_group)
                    .service(api::admin::create_user_group::create_user_group)
                    .service(api::admin::delete_user_group::delete_user_group)
                    .service(api::admin::update_user_group_membership::update_user_group_membership)
                    .service(api::admin::features::features)
                    .service(api::admin::update_feature::update_feature)
                    .service(api::admin::create_storage_endpoint::create_storage_endpoint)
                    .service(api::admin::create_storage_location::create_storage_location)
                    .service(api::admin::delete_storage_location::delete_storage_location)
                    .service(api::admin::storage_endpoints::storage_enpoints)
                    .service(api::admin::storage_endpoint::storage_enpoint)
                    .service(api::admin::storage_endpoint_vfs::storage_enpoint_vfs)
                    .service(api::admin::storage_endpoint_set_vfs_config::storage_endpoint_set_vfs_config)
                    .service(api::admin::update_storage_endpoint::update_storage_endpoint)
                    .service(api::admin::config::config_options::config_options)
                    .service(api::admin::config::config_set::config_set)
                    ,
            )
            .service(
                web::scope("/api")
                    .service(api::user_rights::user_rights)
                    .service(api::instance_config::instance_config)
            )
    })
    .bind((server_address, server_port))?
    .run()
    .and_then(|_| async {
        info!("Server stopped");

        // Unmount all VFS endpoints
        for (endpoint_id, handle) in vfs_state.handles.drain() {
            info!("Unmounting endpoint {endpoint_id}...");

            handle.join();
        }

        Ok(())
    })
    .await
}
