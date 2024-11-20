use std::process::{Command, ExitStatus};

pub fn server_user_create(y_dir: &str) -> std::io::Result<ExitStatus> {
    Command::new("useradd")
        .arg("-r")
        .arg("-M")
        .arg("-s")
        .arg("/bin/bash")
        .arg("-d")
        .arg(y_dir)
        .arg("y-server")
        .status()
}
