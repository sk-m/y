ALTER TABLE IF EXISTS public.storage_files DROP COLUMN IF EXISTS mime_type;
ALTER TABLE IF EXISTS public.storage_files DROP COLUMN IF EXISTS size_bytes;
ALTER TABLE IF EXISTS public.storage_files DROP COLUMN IF EXISTS created_by;
ALTER TABLE IF EXISTS public.storage_files DROP COLUMN IF EXISTS created_at;