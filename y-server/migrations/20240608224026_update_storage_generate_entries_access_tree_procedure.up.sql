-- Old function we forgot to drop
DROP FUNCTION IF EXISTS public.storage_generate_entries_access_tree(IN target_endpoint_id integer,IN target_entry_type storage_entry_type,IN target_action storage_access_action_type,IN target_executor_ids integer[],IN entry_ids bigint[]);

DROP FUNCTION public.storage_generate_entries_access_tree(IN target_endpoint_id integer,IN target_entry_type storage_entry_type,IN target_action storage_access_action_type,IN target_executor_ids integer[],IN target_user_id integer,IN entry_ids bigint[]);

CREATE FUNCTION public.storage_generate_entries_access_tree(IN target_endpoint_id integer,IN target_action storage_access_action_type,IN target_executor_ids integer[],IN target_user_id integer,IN entry_ids bigint[])
    RETURNS TABLE(tree_step integer, entry_id bigint, access_type storage_access_type, executor_type storage_access_executor_type, executor_id integer, target_entry_id bigint)
    LANGUAGE 'plpgsql'
    VOLATILE
    PARALLEL UNSAFE
    COST 200    ROWS 1000 
    
AS $BODY$
	DECLARE 
		curr_entry bigint;
	BEGIN
		CREATE TEMP TABLE temp_table (
			tree_step int,
			entry_id bigint,
			access_type storage_access_type,
			executor_type storage_access_executor_type,
			executor_id int,
			target_entry_id bigint
		) ON COMMIT DROP;

		FOR curr_entry IN (SELECT * FROM unnest(entry_ids))
		LOOP
			-- TODO: This is a bit of a hack
			-- This temp table gets created by the storage_get_folder_path function
      DROP TABLE IF EXISTS folders_path;

      INSERT INTO temp_table
      SELECT tree.tree_step, storage_access.entry_id, storage_access.access_type, storage_access.executor_type, storage_access.executor_id, curr_entry AS target_entry_id
      FROM (SELECT row_number() OVER () AS tree_step, id AS entry_id FROM storage_get_folder_path(target_endpoint_id, curr_entry)) AS tree
      JOIN storage_access
      ON storage_access.entry_id = tree.entry_id
      WHERE storage_access.endpoint_id = target_endpoint_id
      AND storage_access.action = target_action
      AND storage_access.access_type != 'inherit'::storage_access_type AND
      (
        (storage_access.executor_type = 'user_group'::storage_access_executor_type AND storage_access.executor_id = ANY(target_executor_ids))
      OR
        (storage_access.executor_type = 'user'::storage_access_executor_type AND storage_access.executor_id = target_user_id)
      )
      ORDER BY tree_step ASC;
		END LOOP;

		RETURN QUERY SELECT * FROM temp_table;
	END;
$BODY$;
