CREATE TABLE IF NOT EXISTS public.storage_locations
(
    id serial NOT NULL,
    endpoint_id integer NOT NULL,
    entry_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID,
    FOREIGN KEY (entry_id)
        REFERENCES public.storage_entries (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID
);