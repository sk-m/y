CREATE OR REPLACE FUNCTION public.storage_get_folder_path(input_endpoint_id integer, input_entry_id bigint)
 RETURNS TABLE(id bigint, parent_folder bigint, name character varying)
 LANGUAGE plpgsql
AS $function$
 declare 
	last_id bigint;
 begin
  -- TODO: This is a bit of a hack
  DROP TABLE IF EXISTS folders_path;
 
  CREATE TEMP TABLE folders_path ON COMMIT DROP AS SELECT storage_entries.id, storage_entries.parent_folder, storage_entries.name FROM storage_entries WHERE storage_entries.id = input_entry_id AND storage_entries.endpoint_id = input_endpoint_id;
  ALTER TABLE folders_path ADD CONSTRAINT get_folder_path_recursion_guard_unique UNIQUE (id);

  SELECT folders_path.parent_folder INTO last_id FROM folders_path LIMIT 1;

  WHILE (SELECT last_id IS NOT NULL) LOOP
    INSERT INTO folders_path SELECT storage_entries.id, storage_entries.parent_folder, storage_entries.name FROM storage_entries WHERE storage_entries.id = last_id AND storage_entries.endpoint_id = input_endpoint_id RETURNING folders_path.parent_folder INTO last_id;
  END LOOP;

  RETURN QUERY SELECT * FROM folders_path;
 end;
$function$
;

