ALTER TABLE public.storage_entries ADD CONSTRAINT storage_entries_recursion_check CHECK (parent_folder != id);
