TRUNCATE public.storage_archives;

ALTER TABLE IF EXISTS public.storage_archives
    ADD COLUMN ready boolean NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.storage_archives
    ADD COLUMN size_bytes bigint;

ALTER TABLE IF EXISTS public.storage_archives
    ADD COLUMN created_by integer NOT NULL;

ALTER TABLE IF EXISTS public.storage_archives
    ADD COLUMN target_entries_ids bigint[] NOT NULL;

ALTER TABLE IF EXISTS public.storage_archives
    ADD FOREIGN KEY (created_by)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
