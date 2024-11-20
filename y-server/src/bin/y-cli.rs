use colored::Colorize;
use y_server::y_cli::{server_user::server_user_create, svc::svc_create};

fn get_systemctl_status() {
    std::process::Command::new("systemctl")
        .arg("status")
        .arg("y-server")
        .status()
        .expect("failed to execute `systemctl status y-server`");
}

fn main() {
    let matches = clap::Command::new("y-cli")
        .subcommand_required(true)
        .arg_required_else_help(true)
        .subcommand(
            clap::Command::new("svc")
                .about("Service management")
                .subcommand_required(true)
                .arg_required_else_help(true)
                .subcommand(
                    clap::Command::new("install").about("Install y server as a systemd service"),
                )
                .subcommand(clap::Command::new("stop").about("Stop y-server service"))
                .subcommand(clap::Command::new("start").about("Start y-server service"))
                .subcommand(clap::Command::new("status").about("Display service status"))
                .subcommand(clap::Command::new("journal").about("Display service's journal")),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("svc", submatches)) => {
            let svc_command = submatches.subcommand().unwrap();

            let mut systemctl = std::process::Command::new("systemctl");

            match svc_command {
                ("status", _) => {
                    get_systemctl_status();
                }
                ("journal", _) => {
                    std::process::Command::new("journalctl")
                        .arg("-eu")
                        .arg("y-server")
                        .status()
                        .expect("failed to execute journalctl");
                }
                ("stop", _) => {
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
                ("install", _) => {
                    // Install y-server as a systemd service
                    let current_working_dir = std::env::current_dir().unwrap();

                    let y_dir = inquire::Text::new("absolute path to y")
                        .with_default(current_working_dir.to_str().unwrap())
                        .prompt()
                        .expect("inquire error");

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
