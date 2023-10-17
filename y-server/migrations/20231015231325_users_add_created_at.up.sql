ALTER TABLE IF EXISTS public.users
    ADD COLUMN created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;