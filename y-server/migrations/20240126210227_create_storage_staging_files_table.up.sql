CREATE TABLE IF NOT EXISTS public.storage_archives
(
    id serial NOT NULL,
    filesystem_id character(36) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);
