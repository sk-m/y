use sqlx::{postgres::PgPoolOptions, Postgres};
use std::env;

pub async fn connect() -> sqlx::Pool<Postgres> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL env variable must be set");

    let pool = PgPoolOptions::new()
        // TODO: Allow setting via .env file
        .max_connections(5)
        .connect(database_url.as_str())
        .await
        .expect("Could not connect to the database");

    return pool;
}
