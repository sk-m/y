-- down script just reverts the function to its previous, broken version
CREATE OR REPLACE FUNCTION public.storage_get_folder_path(
	input_endpoint_id integer, input_folder_id bigint)
    RETURNS TABLE(id bigint, parent_folder bigint, name character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
 declare 
	last_id bigint;
 begin
  CREATE TEMP TABLE folders_path ON COMMIT DROP AS SELECT storage_folders.id, storage_folders.parent_folder, storage_folders.name FROM storage_folders WHERE storage_folders.id = input_folder_id AND storage_folders.endpoint_id = input_endpoint_id;

  SELECT folders_path.parent_folder INTO last_id FROM folders_path ORDER BY folders_path.id LIMIT 1;

  WHILE (SELECT last_id IS NOT NULL) LOOP
    INSERT INTO folders_path SELECT storage_folders.id, storage_folders.parent_folder, storage_folders.name FROM storage_folders WHERE storage_folders.id = last_id AND storage_folders.endpoint_id = input_endpoint_id;
    SELECT folders_path.parent_folder INTO last_id FROM folders_path ORDER BY folders_path.id LIMIT 1;
  END LOOP;

  RETURN QUERY SELECT * FROM folders_path;
 end;
$BODY$;