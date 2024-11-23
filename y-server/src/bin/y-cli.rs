use std::{fs, path::Path, time::SystemTime};

use chrono::{DateTime, Utc};
use clap::ArgAction;
use colored::Colorize;
use y_server::y_cli::{
    config::{config_get_path, config_read, config_write, get_y_server_version},
    server_user::server_user_create,
    svc::svc_create,
    updates::{download_dist, fetch_latest_version, unzip_dist},
};

fn get_systemctl_status() {
    std::process::Command::new("systemctl")
        .arg("status")
        .arg("y-server")
        .status()
        .expect("failed to execute `systemctl status y-server`");
}

fn get_work_path() -> Box<Path> {
    let user_home = dirs::home_dir().expect("failed to get user home directory");
    let work_path = Path::new(user_home.as_path()).join(".y-cli");

    let dirs = ["updates"];

    for path in dirs.iter() {
        let dir_path = work_path.join(path);

        if !dir_path.exists() {
            fs::create_dir_all(&dir_path).expect("failed to create y-cli work directory");
        }
    }

    work_path.into_boxed_path()
}

const Y_CLI_VERSION: &str = "0.0.1-alpha";

#[tokio::main]
async fn main() {
    let config_path = config_get_path();
    let work_path = get_work_path();

    let mut config = config_read(config_path.to_str().unwrap());

    let matches = clap::Command::new("y-cli")
        .arg_required_else_help(true)
        .args([clap::Arg::new("version")
            .short('v')
            .long("version")
            .help("Print version and exit")
            .action(ArgAction::SetTrue)])
        .subcommand(clap::Command::new("init").about("Setup y-cli"))
        .subcommand(
            clap::Command::new("update")
                .about("Update manager")
                .subcommand_required(true)
                .arg_required_else_help(true)
                .subcommand(
                    clap::Command::new("install")
                        .about("Check for updates and (optionally) install the new version"),
                ),
        )
        .subcommand(
            clap::Command::new("svc")
                .about("Service management")
                .subcommand_required(true)
                .arg_required_else_help(true)
                .subcommand(
                    clap::Command::new("install").about("Install y server as a systemd service"),
                )
                .subcommand(clap::Command::new("start").about("Start y-server service"))
                .subcommand(clap::Command::new("stop").about("Stop y-server service"))
                .subcommand(clap::Command::new("restart").about("Restart y-server service"))
                .subcommand(clap::Command::new("status").about("Display service status"))
                .subcommand(clap::Command::new("journal").about("Display service's journal")),
        )
        .get_matches();

    if matches.get_flag("version") {
        println!("{}", Y_CLI_VERSION);
        return;
    }

    match matches.subcommand() {
        Some(("init", _)) => {
            // Perform initial y-cli setup
            let current_working_dir = std::env::current_dir().unwrap();

            let new_y_dir = inquire::Text::new("absolute path to your y installation")
                .with_default(current_working_dir.to_str().unwrap())
                .with_help_message("enter the path to where you have unpacked y. This folder should contain the `y-server` binary")
                .prompt()
                .expect("inquire error");

            if new_y_dir.is_empty() {
                println!("{} aborting", "info:".bold());
                return;
            }

            let y_server_version = get_y_server_version(new_y_dir.as_str());

            if let Some(version) = y_server_version {
                println!(
                    "{} installed version: {}",
                    "info:".bold(),
                    version.bright_white()
                );
            } else {
                println!(
                    "{} failed to read y-server version. Make sure the path is correct",
                    "error:".red().bold()
                );

                return;
            }

            config.y_dir = Some(new_y_dir);

            let write_result = config_write(config_path.to_str().unwrap(), &config);

            if let Err(err) = write_result {
                println!(
                    "{} failed to write y-cli config file: {}",
                    "error:".red().bold(),
                    err
                );

                return;
            }

            println!("{} config saved", "info:".bold());
        }
        Some(("update", submatches)) => {
            // Update manager
            let update_command = submatches.subcommand().unwrap();

            match update_command {
                ("install", _) => {
                    // Check for updates & install the newest version
                    if config.y_dir.is_none() {
                        println!(
                            "{} the path to your y installation is not set! Run `y-cli init` to perform initial setup",
                            "error:".red().bold()
                        );
                        return;
                    }

                    let current_version =
                        get_y_server_version(config.y_dir.as_ref().unwrap().as_str());

                    if let Some(version) = &current_version {
                        println!(
                            "{} installed version is {} ({})",
                            "info:".bold(),
                            version.bright_white(),
                            config.y_dir.as_ref().unwrap()
                        );
                    } else {
                        println!(
                            "{} failed to read your current y-server version. Run `y-cli init` to update the path",
                            "error:".red().bold()
                        );
                    }

                    println!("{} checking for updates", "info:".bold());

                    let latest_version_info = fetch_latest_version().await;

                    if let Ok(latest_info) = latest_version_info {
                        let current_version =
                            semver::Version::parse(&current_version.unwrap()).unwrap();

                        let latest_version_str = latest_info.version.to_string();

                        if latest_info.version > current_version {
                            println!(
                                "{} new version available: {} (released {})",
                                "info:".bold(),
                                latest_version_str.green(),
                                latest_info.release_date
                            );

                            let confirm = inquire::Confirm::new(
                                format!("update to {}?", latest_version_str).as_str(),
                            )
                            .with_default(true)
                            .with_help_message("the server will be stopped for a few seconds")
                            .prompt()
                            .expect("inquire error");

                            if !confirm {
                                println!("{} aborting", "info:".bold());
                                return;
                            }

                            let create_backup = inquire::Confirm::new(
                                "create a backup of your current installation?",
                            )
                            .with_default(true)
                            .prompt()
                            .expect("inquire error");

                            // Download the distribution
                            println!("{} downloading", "info:".bold());

                            let downloaded_file =
                                download_dist(work_path.to_str().unwrap(), &latest_info.tag_name)
                                    .await
                                    .expect("failed to download distribution");

                            // Unzip
                            println!("{} unpacking", "info:".bold());

                            let new_version_dir =
                                work_path.join("updates").join(&latest_version_str);

                            unzip_dist(&downloaded_file, &new_version_dir);

                            let dotenv_file = new_version_dir.join(".env");

                            if dotenv_file.exists() {
                                fs::rename(dotenv_file, new_version_dir.join(".env.new"))
                                    .expect("failed to rename .env file");
                            }

                            // Create a backup
                            if create_backup {
                                println!(
                                    "{} creating a backup of your current installation",
                                    "info:".bold()
                                );

                                let datetime: DateTime<Utc> = SystemTime::now().into();

                                let backup_dir = work_path.join("backups").join(format!(
                                    "{}_before_{}",
                                    datetime.format("%Y%m%d%H%M%S"),
                                    current_version,
                                ));

                                fs::create_dir_all(&backup_dir)
                                    .expect("failed to create backup directory");

                                std::process::Command::new("cp")
                                    .arg("-r")
                                    .arg(config.y_dir.as_ref().unwrap())
                                    .arg(backup_dir.to_str().unwrap())
                                    .status()
                                    .expect("failed to create a backup");
                            }

                            // Remove old `www` directory
                            let current_www_dir =
                                Path::new(config.y_dir.as_ref().unwrap()).join("www");

                            if current_www_dir.exists() {
                                let confirm = inquire::Confirm::new(
                                    format!(
                                        "confirm `rm -r {}`?",
                                        current_www_dir.to_str().unwrap()
                                    )
                                    .as_str(),
                                )
                                .with_default(false)
                                .prompt()
                                .expect("inquire error");

                                if confirm {
                                    fs::remove_dir_all(&current_www_dir)
                                        .expect("failed to remove old www directory");
                                }
                            }

                            // Copy over new files
                            println!("{} copying new files", "info:".bold());

                            std::process::Command::new("cp")
                                .arg("-r")
                                .arg(new_version_dir.join(".").to_str().unwrap())
                                .arg(config.y_dir.as_ref().unwrap())
                                .status()
                                .expect("failed to copy new files");

                            // Restart the server
                            println!("{} done", "info:".bold());
                            println!("{} we did not override your current `.env` file. Please check your installation folder and compare your current `.env` file to the new `.env.new`. New configuration options might have been added", "hint:".bold());

                            let confirm = inquire::Confirm::new("restart y-server now?")
                                .with_default(true)
                                .prompt()
                                .expect("inquire error");

                            if confirm {
                                println!("{} restarting the server", "info:".bold());

                                std::process::Command::new("systemctl")
                                    .arg("restart")
                                    .arg("y-server")
                                    .status()
                                    .expect("failed to restart y-server");
                            } else {
                                println!(
                                    "{} please restart the server as soon as you can! (`y-cli svc restart`)",
                                    "hint:".bold()
                                );
                            }
                        } else {
                            println!(
                                "{} no updates available (latest is {})",
                                "info:".bold(),
                                latest_version_str
                            );
                        }
                    } else {
                        println!(
                            "{} failed to check for updates. Make sure you have an active internet connection",
                            "error:".red().bold()
                        );
                    }
                }
                _ => unreachable!(),
            }
        }
        Some(("svc", submatches)) => {
            // `y-server` systemd service management
            let svc_command = submatches.subcommand().unwrap();

            let mut systemctl = std::process::Command::new("systemctl");

            match svc_command {
                ("status", _) => {
                    // Show `y-server` service status
                    get_systemctl_status();
                }
                ("journal", _) => {
                    // Show `y-server` service journal
                    std::process::Command::new("journalctl")
                        .arg("-eu")
                        .arg("y-server")
                        .status()
                        .expect("failed to execute journalctl");
                }
                ("stop", _) => {
                    // Stop systemd service
                    let stop_result = systemctl.arg("stop").arg("y-server").status();

                    if let Err(err) = stop_result {
                        println!(
                            "{} failed to stop y-server service. {:?}",
                            "error:".red().bold(),
                            err
                        );
                    } else {
                        println!("{} stopped", "info:".bold());

                        get_systemctl_status();
                    }
                }
                ("start", _) => {
                    // Start systemd service
                    let start_result = systemctl.arg("start").arg("y-server").status();

                    if let Err(err) = start_result {
                        println!(
                            "{} failed to start y-server service. {:?}",
                            "error:".red().bold(),
                            err
                        );
                    } else {
                        println!("{} started", "info:".bold());

                        get_systemctl_status();
                    }
                }
                ("restart", _) => {
                    // Restart systemd service
                    let restart_result = systemctl.arg("restart").arg("y-server").status();

                    if let Err(err) = restart_result {
                        println!(
                            "{} failed to restart y-server service. {:?}",
                            "error:".red().bold(),
                            err
                        );
                    } else {
                        println!("{} restarted", "info:".bold());

                        get_systemctl_status();
                    }
                }
                ("install", _) => {
                    // Install y-server as a systemd service
                    if config.y_dir.is_none() {
                        println!(
                            "{} the path to your y installation is not set! Run `y-cli init` to perform initial setup",
                            "error:".red().bold()
                        );
                        return;
                    }

                    let y_dir = config.y_dir.unwrap();

                    println!("{} using path: {}", "info:".bold(), y_dir);

                    let enable = inquire::Confirm::new("start y-server on boot?")
                        .with_default(true)
                        .prompt()
                        .expect("inquire error");

                    let server_user = users::get_user_by_name("y-server");

                    if server_user.is_none() {
                        println!("{} creating a `y-server` user", "info:".bold());

                        let create_user_result = server_user_create(y_dir.as_str());

                        if let Err(err) = create_user_result {
                            println!(
                                "{} failed to create `y-server` user: {}",
                                "error:".red().bold(),
                                err
                            );
                            return;
                        }
                    } else {
                        println!("{} `y-server` user found", "info:".bold());
                    }

                    let create_result = svc_create(y_dir.as_str(), false);

                    if create_result {
                        println!("{} service installed", "info:".bold());

                        if enable {
                            println!("{} enabling service", "info:".bold());

                            let enable_result = systemctl.arg("enable").arg("y-server").status();

                            if let Err(err) = enable_result {
                                println!(
                                    "{} failed to enable y-server service. {:?}",
                                    "error:".red().bold(),
                                    err
                                );
                            }
                        }

                        get_systemctl_status();

                        println!(
                            "{} run `y-cli svc start` to start the server",
                            "hint:".bold()
                        );
                    }
                }

                _ => unreachable!(),
            }
        }

        _ => unreachable!(),
    }
}
