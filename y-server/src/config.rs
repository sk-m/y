// Config keys that should never expose their current values to clients (in other words, "write only")
// Must include keys that contain sensitive information, such as API keys.
pub static SECRET_CONFIG_KEYS: &'static [&str] = &[];
