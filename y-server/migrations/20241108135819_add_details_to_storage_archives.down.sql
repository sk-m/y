ALTER TABLE IF EXISTS public.storage_archives DROP COLUMN IF EXISTS created_by;
ALTER TABLE IF EXISTS public.storage_archives DROP COLUMN IF EXISTS target_entries_ids;
ALTER TABLE IF EXISTS public.storage_archives DROP COLUMN IF EXISTS ready;
ALTER TABLE IF EXISTS public.storage_archives DROP COLUMN IF EXISTS size_bytes;