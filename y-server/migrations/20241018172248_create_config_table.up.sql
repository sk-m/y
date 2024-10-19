CREATE TABLE IF NOT EXISTS public.config
(
    key character varying(64) NOT NULL,
    value text,
    updated_at timestamp with time zone,
    updated_by integer,
    PRIMARY KEY (key),
    FOREIGN KEY (updated_by)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
        NOT VALID
);

INSERT INTO public.config (key, value) VALUES ('instance.name', 'y instance'), ('instance.logo_url', '');