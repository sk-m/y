ALTER TABLE IF EXISTS public.storage_files
    ADD COLUMN mime_type character varying(256);

ALTER TABLE IF EXISTS public.storage_files
    ADD COLUMN size_bytes bigint;

ALTER TABLE IF EXISTS public.storage_files
    ADD COLUMN created_by integer;

ALTER TABLE IF EXISTS public.storage_files
    ADD COLUMN created_at timestamp with time zone;

ALTER TABLE IF EXISTS public.storage_files
    ADD FOREIGN KEY (created_by)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;