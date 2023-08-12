use actix_web::web;
use diesel::prelude::*;
use diesel::r2d2::*;

pub type RequestPool = web::Data<Pool<ConnectionManager<PgConnection>>>;

pub fn cli_create_admin(
    connection: &mut PgConnection,
    username: &str,
    password: &str,
) -> Result<(), &'static str> {
    use crate::models::user::NewUser;
    use crate::schema::users;

    use pbkdf2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Pbkdf2,
    };

    let password_salt = SaltString::generate(&mut OsRng);
    let password_hash = Pbkdf2.hash_password(password.as_bytes(), &password_salt);

    match password_hash {
        Ok(password_hash) => {
            let password_hash = password_hash.to_string();

            let new_user = NewUser {
                username: username,
                password: password_hash.as_str(),
            };

            let result = diesel::insert_into(users::table)
                .values(&new_user)
                .execute(connection);

            match result {
                Ok(_) => Ok(()),
                Err(_) => Err("Error creating a new admin user"),
            }
        }
        Err(_) => Err("Error hashing the password for a new admin user"),
    }
}
