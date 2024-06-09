ALTER TABLE IF EXISTS public.storage_access DROP CONSTRAINT IF EXISTS storage_access_endpoint_id_entry_id_action_executor_type_ex_key;

ALTER TABLE IF EXISTS public.storage_access
    ADD UNIQUE (endpoint_id, entry_type, entry_id, action, executor_type, executor_id);
