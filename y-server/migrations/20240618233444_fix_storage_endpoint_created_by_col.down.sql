ALTER TABLE IF EXISTS public.storage_entries DROP CONSTRAINT IF EXISTS storage_entries_created_by_fkey;

ALTER TABLE IF EXISTS public.storage_entries
    ADD CONSTRAINT storage_entries_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE SET NULL
    NOT VALID;