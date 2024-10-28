use log::info;
use sqlx::{postgres::PgPoolOptions, Postgres};
use std::env;

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

    let pool = PgPoolOptions::new()
        // TODO: Allow setting via .env file
        .max_connections(max_connections)
        .connect(database_url.as_str())
        .await
        .expect("Could not connect to the database");

    return pool;
}
