use log::info;
use sqlx::ConnectOptions;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    Postgres,
};
use std::time::Duration;
use std::{env, str::FromStr};

pub async fn connect() -> sqlx::Pool<Postgres> {
    let max_connections = env::var("DATABASE_MAX_CONNECTIONS")
        .unwrap_or("5".to_string())
        .parse::<u32>()
        .expect("MAX_CONNECTIONS must be a number");

    info!(
        "Connecting to the database with {} max connections",
        max_connections
    );

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL env variable must be set");

    let options = PgConnectOptions::from_str(&database_url.as_str())
        .unwrap()
        .disable_statement_logging()
        .log_slow_statements(log::LevelFilter::Warn, Duration::from_secs(1));

    PgPoolOptions::new()
        .max_connections(max_connections)
        .connect_with(options)
        .await
        .expect("Could not connect to the database")
}
