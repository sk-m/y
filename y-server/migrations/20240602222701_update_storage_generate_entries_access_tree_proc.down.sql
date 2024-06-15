CREATE OR REPLACE FUNCTION public.storage_generate_entries_access_tree(
	target_endpoint_id integer,
	target_entry_type storage_entry_type,
	target_action storage_access_action_type,
	target_executor_ids integer[],
	entry_ids bigint[])
    RETURNS TABLE(tree_step integer, entry_id bigint, access_type storage_access_type, executor_id integer, entry_type storage_entry_type, target_entry_id bigint) 
    LANGUAGE 'plpgsql'
    COST 200
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
	DECLARE
		curr_entry bigint;
	BEGIN
		CREATE TEMP TABLE temp_table (
			tree_step int,
			entry_id bigint,
			access_type storage_access_type,
			executor_id int,
			entry_type storage_entry_type,
			target_entry_id bigint
		) ON COMMIT DROP;

		FOR curr_entry IN (SELECT * FROM unnest(entry_ids))
		LOOP
			-- TODO: This is a bit of a hack
			-- This temp table gets created by the storage_get_folder_path function
      DROP TABLE IF EXISTS folders_path;

			IF target_entry_type = 'file'::storage_entry_type THEN
				-- For files
				-- TODO: Can we do this in one query?

				-- Get rules for the target file itself
				INSERT INTO temp_table
				SELECT 0 AS tree_step, storage_access.entry_id, storage_access.access_type, storage_access.executor_id, storage_access.entry_type, curr_entry AS target_entry_id
				FROM storage_access
				WHERE storage_access.entry_type = 'file'::storage_entry_type
				AND storage_access.entry_id = curr_entry
				AND storage_access.endpoint_id = target_endpoint_id
				AND storage_access.action = target_action
				AND storage_access.access_type != 'inherit'::storage_access_type
				AND storage_access.executor_type = 'user_group'::storage_access_executor_type
				AND storage_access.executor_id = ANY(target_executor_ids)
				ORDER BY tree_step ASC;

				-- Get file's parent folder id
				-- Continuously get rules for each parent folder until root
				INSERT INTO temp_table
				SELECT tree_t.tree_step, storage_access.entry_id, storage_access.access_type, storage_access.executor_id, storage_access.entry_type, curr_entry AS target_entry_id
				FROM (SELECT row_number() OVER () as tree_step, storage_get_folder_path.id FROM storage_get_folder_path(target_endpoint_id, (SELECT parent_folder FROM storage_entries WHERE entry_type = 'file'::storage_entry_type AND endpoint_id = target_endpoint_id AND id = curr_entry))) AS tree_t
				LEFT JOIN storage_access
				ON storage_access.entry_id = tree_t.id
				WHERE storage_access.entry_type = 'folder'::storage_entry_type
				AND storage_access.endpoint_id = target_endpoint_id
				AND storage_access.action = target_action
				AND storage_access.access_type != 'inherit'::storage_access_type
				AND storage_access.executor_type = 'user_group'::storage_access_executor_type
				AND storage_access.executor_id = ANY(target_executor_ids)
				ORDER BY tree_step ASC;
			ELSE
				-- For folders

				-- Get rules for the folder itself and each parent folder until root
				INSERT INTO temp_table
				SELECT tree_t.tree_step, storage_access.entry_id, storage_access.access_type, storage_access.executor_id, storage_access.entry_type, curr_entry AS target_entry_id
				FROM (SELECT row_number() OVER () as tree_step, storage_get_folder_path.id FROM storage_get_folder_path(target_endpoint_id, curr_entry)) AS tree_t
				LEFT JOIN storage_access
				ON storage_access.entry_id = tree_t.id
				WHERE storage_access.entry_type = 'folder'::storage_entry_type
				AND storage_access.endpoint_id = target_endpoint_id
				AND storage_access.action = target_action
				AND storage_access.access_type != 'inherit'::storage_access_type
				AND storage_access.executor_type = 'user_group'::storage_access_executor_type
				AND storage_access.executor_id = ANY(target_executor_ids)
				ORDER BY tree_step ASC;
			END IF;
		END LOOP;

		RETURN QUERY SELECT * FROM temp_table;
	END;
$BODY$;
