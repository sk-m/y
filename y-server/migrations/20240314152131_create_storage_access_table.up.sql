CREATE TYPE public.storage_entry_type AS ENUM
    ('file', 'folder');

CREATE TYPE public.storage_access_type AS ENUM
    ('allow', 'deny', 'inherit');

CREATE TYPE public.storage_access_action_type AS ENUM
    ('list_entries', 'download', 'upload', 'rename', 'move', 'delete', 'manage_access');

CREATE TYPE public.storage_access_executor_type AS ENUM
    ('user_group', 'user');

CREATE TABLE IF NOT EXISTS public.storage_access
(
    id bigserial NOT NULL,
    endpoint_id integer NOT NULL,
    entry_type storage_entry_type NOT NULL,
    entry_id bigint NOT NULL,
    access_type storage_access_type NOT NULL,
    action storage_access_action_type NOT NULL,
    executor_type storage_access_executor_type NOT NULL,
    executor_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE CASCADE
        NOT VALID
);

ALTER TABLE IF EXISTS public.storage_access
    ADD UNIQUE (endpoint_id, entry_type, entry_id, executor_type, action, executor_id);
