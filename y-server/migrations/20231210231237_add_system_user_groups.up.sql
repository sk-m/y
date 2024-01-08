ALTER TABLE IF EXISTS public.user_groups
    ADD COLUMN group_type character varying(128);

INSERT INTO user_groups (name, group_type) VALUES ('everyone', 'everyone'), ('user', 'user');
