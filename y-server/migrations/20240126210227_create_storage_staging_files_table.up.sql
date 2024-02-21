CREATE TABLE IF NOT EXISTS public.storage_archives
(
    id serial NOT NULL,
    endpoint_id int NOT NULL,
    filesystem_id character(36) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);
