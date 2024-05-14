DROP FUNCTION IF EXISTS public.storage_generate_entries_access_tree(
    target_endpoint_id int,
    target_entry_type storage_entry_type,
    target_action storage_access_action_type,
    target_executor_ids int[],
    entry_ids bigint[]
)