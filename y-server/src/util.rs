pub type RequestPool = sqlx::Pool<sqlx::Postgres>;

pub async fn cli_create_user(
    pool: &RequestPool,
    username: &str,
    password: &str,
    group: Option<&str>,
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

            let user_id = sqlx::query_scalar::<_, i32>(
                "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
            )
            .bind(username)
            .bind(password_hash.as_str())
            .fetch_one(pool)
            .await;

            match user_id {
                Ok(user_id) => {
                    println!("User created successfully.");

                    if let Some(group) = group {
                        println!("Adding to the group...");

                        let group_id = sqlx::query_scalar::<_, i32>(
                            "SELECT id FROM user_groups WHERE name = $1",
                        )
                        .bind(group)
                        .fetch_one(pool)
                        .await;

                        if !group_id.is_ok() {
                            return Err("Could not find requested group.");
                        }

                        let group_result = sqlx::query(
                            "INSERT INTO user_group_membership (user_id, group_id) VALUES ($1, $2)",
                        )
                        .bind(user_id)
                        .bind(group_id.unwrap())
                        .execute(pool)
                        .await;

                        match group_result {
                            Ok(_) => {
                                println!("Group added.");
                                return Ok(());
                            }
                            Err(_) => {
                                return Err("Could not add the user to the group.");
                            }
                        }
                    } else {
                        Ok(())
                    }
                }
                Err(_) => Err("Error creating a new user."),
            }
        }
        Err(_) => Err("Error hashing the password for a new user."),
    }
}
