use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub y_dir: Option<String>,
}

pub fn config_get_path() -> Box<Path> {
    let user_home = dirs::home_dir().expect("failed to get user home directory");
    let config_path = Path::new(user_home.as_path())
        .join(".config")
        .join("y-cli")
        .join("y-cli.toml");

    if !config_path.exists() {
        fs::create_dir_all(&config_path.parent().unwrap())
            .expect("failed to create y-cli config directory ($HOME/.config/y-cli)");

        fs::write(&config_path, "").expect("failed to write y-cli config file");
    }

    config_path.into_boxed_path()
}

pub fn config_read(path: &str) -> Config {
    let data = fs::read(path).expect("failed to read y-cli config file");
    let text = String::from_utf8(data).expect("failed to read y-cli config file");
    let config: Config = toml::from_str(&text).expect("failed to parse y-cli config file");

    config
}

pub fn config_write(path: &str, config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    fs::write(path, toml::to_string(config)?)?;

    Ok(())
}

pub fn get_y_server_version(path: &str) -> Option<String> {
    let bin_path = Path::new(path).join("y-server");

    let version = std::process::Command::new(bin_path)
        .arg("--version")
        .output();

    if let Ok(version) = version {
        Some(
            String::from_utf8(version.stdout)
                .expect("failed to get y-server version")
                .trim_ascii()
                .to_string(),
        )
    } else {
        return None;
    }
}
