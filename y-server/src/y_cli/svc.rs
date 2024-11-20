use colored::Colorize;
use std::{fs::File, io::Write, path::Path};

pub fn svc_create(y_dir: &str, force: bool) -> bool {
    println!("{} creating a service", "info:".bold());

    let definition_file_path = Path::new("/etc/systemd/system").join("y-server.service");

    if definition_file_path.exists() && !force {
        let confirm = inquire::Confirm::new("service definition already exists, overwrite?")
            .with_default(false)
            .prompt();

        if confirm.unwrap_or(false) == false {
            println!("{} aborting", "info:".bold());
            return false;
        }
    }

    let service_definition_file = File::create(definition_file_path);

    match service_definition_file {
        Ok(mut service_definition_file) => {
            let write_result = service_definition_file.write_all(
                format!(
                    "[Unit]
Description=y server
Before=postgresql.service

[Install]
WantedBy=default.target

[Service]
User=y-server
WorkingDirectory={}
ExecStart={}/y-server
",
                    y_dir, y_dir
                )
                .as_bytes(),
            );

            if let Err(err) = write_result {
                println!(
                    "{} failed to write a service definition file (/etc/systemd/system/y-server.service): {}",
                    "error:".red().bold(),
                    err
                );

                return false;
            }

            let reload_result = std::process::Command::new("systemctl")
                .arg("daemon-reload")
                .status();

            if let Err(err) = reload_result {
                println!(
                    "{} failed to execute `systemctl daemon-reload`: {}",
                    "error:".red().bold(),
                    err
                );

                return false;
            }

            return true;
        }
        Err(err) => {
            println!(
                "{} failed to create a service definition file (/etc/systemd/system/y-server.service): {}",
                "error:".red().bold(),
                err
            );

            return false;
        }
    }
}
