use std::collections::HashMap;

use sqlx::prelude::FromRow;

use crate::util::RequestPool;

// Config keys that should never expose their current values to clients (in other words, "write only")
// Must include keys that contain sensitive information, such as API keys.
pub static SECRET_CONFIG_KEYS: &'static [&str] = &[];

pub async fn get_config(pool: &RequestPool) -> HashMap<String, String> {
    #[derive(FromRow)]
    struct ConfigItem {
        key: String,
        value: String,
    }

    let result = sqlx::query_as::<_, ConfigItem>("SELECT key, value FROM config")
        .fetch_all(pool)
        .await;

    match result {
        Ok(values) => values
            .into_iter()
            .map(|item| (item.key, item.value))
            .collect(),
        Err(_) => HashMap::new(),
    }
}

pub fn validate_config_value(key: &str, value: &str) -> Result<(), &'static str> {
    match key {
        "instance.name" => {
            if value.len() < 1 || value.len() > 127 {
                return Err("Invalid value length");
            }

            Ok(())
        }

        "instance.logo_url" => {
            if value.len() > 255 {
                return Err("Invalid value length");
            }

            Ok(())
        }

        "storage.transcode_videos.enabled"
        | "storage.generate_seeking_thumbnails.enabled"
        | "storage.generate_thumbnails.video"
        | "storage.generate_thumbnails.audio"
        | "storage.generate_thumbnails.image" => {
            if value != "true" && value != "false" {
                return Err("Invalid boolean value");
            }

            Ok(())
        }

        "storage.transcode_videos.target_height"
        | "storage.transcode_videos.target_bitrate"
        | "storage.generate_seeking_thumbnails.desired_frames" => {
            if value.parse::<u32>().is_err() {
                return Err("Invalid integer value");
            }

            Ok(())
        }

        _ => Err("Unknown key"),
    }
}
