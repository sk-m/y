DROP FUNCTION IF EXISTS public.storage_get_folder_path(IN input_endpoint_id integer,IN input_entry_id bigint);

CREATE OR REPLACE FUNCTION public.storage_get_folder_path(IN input_endpoint_id integer,IN input_folder_id bigint)
    RETURNS TABLE(id bigint, parent_folder bigint, name character varying)
    LANGUAGE 'plpgsql'
    VOLATILE
    PARALLEL UNSAFE
    COST 100    ROWS 1000 
    
AS $BODY$
 declare 
	last_id bigint;
 begin
  CREATE TEMP TABLE folders_path ON COMMIT DROP AS SELECT storage_entries.id, storage_entries.parent_folder, storage_entries.name FROM storage_entries WHERE storage_entries.entry_type = 'folder'::storage_entry_type AND storage_entries.id = input_folder_id AND storage_entries.endpoint_id = input_endpoint_id;

  SELECT folders_path.parent_folder INTO last_id FROM folders_path LIMIT 1;

  WHILE (SELECT last_id IS NOT NULL) LOOP
    INSERT INTO folders_path SELECT storage_entries.id, storage_entries.parent_folder, storage_entries.name FROM storage_entries WHERE storage_entries.entry_type = 'folder'::storage_entry_type AND storage_entries.id = last_id AND storage_entries.endpoint_id = input_endpoint_id RETURNING folders_path.parent_folder INTO last_id;
  END LOOP;

  RETURN QUERY SELECT * FROM folders_path;
 end;
$BODY$;