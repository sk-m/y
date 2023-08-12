// @generated automatically by Diesel CLI.

diesel::table! {
    user_sessions (id) {
        id -> Int4,
        session_id -> Uuid,
        #[max_length = 256]
        session_key -> Varchar,
        user_id -> Int4,
        created_at -> Timestamp,
        expires_on -> Nullable<Timestamp>,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        #[max_length = 128]
        username -> Varchar,
        #[max_length = 512]
        password -> Nullable<Varchar>,
    }
}

diesel::joinable!(user_sessions -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    user_sessions,
    users,
);
