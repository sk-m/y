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
