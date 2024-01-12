CREATE TYPE public.storage_endpoint_type AS ENUM
    ('local_fs');

CREATE TYPE public.storage_endpoint_status AS ENUM
    ('active', 'read_only', 'disabled');

CREATE TABLE IF NOT EXISTS public.storage_endpoints
(
    id serial NOT NULL,
    name character varying(128) NOT NULL,
    endpoint_type storage_endpoint_type NOT NULL,
    status storage_endpoint_status NOT NULL,
    preserve_file_structure boolean NOT NULL DEFAULT false,
    base_path character varying(512) NOT NULL,
    description character varying(256),
    PRIMARY KEY (id)
);
