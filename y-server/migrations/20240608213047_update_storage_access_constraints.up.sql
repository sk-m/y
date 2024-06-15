ALTER TABLE IF EXISTS public.storage_access DROP CONSTRAINT IF EXISTS storage_access_endpoint_id_entry_type_entry_id_action_execu_key;

ALTER TABLE IF EXISTS public.storage_access
    ADD UNIQUE (endpoint_id, entry_id, action, executor_type, executor_id);
