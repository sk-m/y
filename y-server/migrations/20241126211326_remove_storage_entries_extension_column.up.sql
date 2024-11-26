-- Concat name and extension columns into name column
UPDATE storage_entries SET name = storage_entries.name || '.' || storage_entries.extension WHERE "extension" IS NOT NULL AND "extension" != '';

-- Drop the column
ALTER TABLE public.storage_entries DROP CONSTRAINT storage_entries_endpoint_id_parent_folder_entry_type_name_e_key;
ALTER TABLE public.storage_entries DROP COLUMN "extension";

-- Add new unique constraint
ALTER TABLE public.storage_entries ADD CONSTRAINT storage_entries_unique UNIQUE (endpoint_id,parent_folder,"name");
