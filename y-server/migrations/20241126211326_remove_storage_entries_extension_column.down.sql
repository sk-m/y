-- Add extension column back
ALTER TABLE public.storage_entries ADD COLUMN "extension" character varying(256);

-- Drop the new constraint
ALTER TABLE public.storage_entries DROP CONSTRAINT storage_entries_unique;

-- Add the old constraint
ALTER TABLE public.storage_entries ADD CONSTRAINT storage_entries_endpoint_id_parent_folder_entry_type_name_e_key UNIQUE (endpoint_id,parent_folder,entry_type,"name","extension");
