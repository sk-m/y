CREATE TABLE IF NOT EXISTS public.storage_folders
(
    id bigserial NOT NULL,
    endpoint_id int NOT NULL,
    parent_folder bigint,
    name character varying(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE NULLS NOT DISTINCT (endpoint_id, parent_folder, name),
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    FOREIGN KEY (parent_folder)
        REFERENCES public.storage_folders (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

CREATE TABLE IF NOT EXISTS public.storage_files
(
    id bigserial NOT NULL,
    endpoint_id int NOT NULL,
    filesystem_id character(36) NOT NULL,
    parent_folder bigint,
    name character varying(256) NOT NULL,
    extension character varying(256),
    PRIMARY KEY (id),
    UNIQUE (filesystem_id),
    UNIQUE NULLS NOT DISTINCT (endpoint_id, parent_folder, name, extension),
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    FOREIGN KEY (parent_folder)
        REFERENCES public.storage_folders (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);
