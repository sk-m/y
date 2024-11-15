CREATE TABLE public.storage_user_pins
(
    pin_id serial NOT NULL,
    user_id integer NOT NULL,
    endpoint_id integer NOT NULL,
    entry_id bigint NOT NULL,
    name character varying(64) NOT NULL,
    PRIMARY KEY (pin_id),
    FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID,
    FOREIGN KEY (endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID,
    FOREIGN KEY (entry_id)
        REFERENCES public.storage_entries (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID
);
