ALTER TABLE public.storage_entries
    ADD COLUMN downloads_count integer NOT NULL DEFAULT 0;