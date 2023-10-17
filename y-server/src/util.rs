pub type RequestPool = sqlx::Pool<sqlx::Postgres>;

pub async fn cli_create_admin(
    pool: &RequestPool,
    username: &str,
    password: &str,
) -> Result<(), &'static str> {
    use pbkdf2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Pbkdf2,
    };

    let password_salt = SaltString::generate(&mut OsRng);
    let password_hash = Pbkdf2.hash_password(password.as_bytes(), &password_salt);

    match password_hash {
        Ok(password_hash) => {
            let password_hash = password_hash.to_string();

            let result = sqlx::query("INSERT INTO users (username, password) VALUES ($1, $2)")
                .bind(username)
                .bind(password_hash.as_str())
                .execute(pool)
                .await;

            match result {
                Ok(_) => Ok(()),
                Err(_) => Err("Error creating a new admin user"),
            }
        }
        Err(_) => Err("Error hashing the password for a new admin user"),
    }
}
