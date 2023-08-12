use diesel::pg::PgConnection;
use diesel::r2d2::ConnectionManager;
use diesel::r2d2::Pool;
use std::env;

pub fn connect_to_database() -> Pool<ConnectionManager<PgConnection>> {
    let (host, user, password, dbname) = (
        env::var("DATABASE_HOST").expect("DATABASE_HOST env variable must be set"),
        env::var("DATABASE_USER").expect("DATABASE_USER env variable must be set"),
        env::var("DATABASE_PASSWORD").expect("DATABASE_PASSWORD env variable must be set"),
        env::var("DATABASE_DBNAME").expect("DATABASE_DBNAME env variable must be set"),
    );

    let database_connection_string = format!(
        "host={} user={} password={} dbname={}",
        host, user, password, dbname
    );

    let manager = ConnectionManager::<PgConnection>::new(database_connection_string);

    Pool::builder()
        .test_on_check_out(true)
        .build(manager)
        .expect("Could not build connection pool")
}