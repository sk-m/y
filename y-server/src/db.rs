use sqlx::{postgres::PgPoolOptions, Postgres};
use std::env;

pub async fn connect_to_database() -> sqlx::Pool<Postgres> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL env variable must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url.as_str())
        .await
        .expect("Could not connect to the database");

    return pool;
}
