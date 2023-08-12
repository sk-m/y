CREATE TABLE IF NOT EXISTS public.user_sessions
(
    id serial NOT NULL,
    session_id uuid NOT NULL,
    session_key character varying(256) NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    expires_on timestamp without time zone,
    PRIMARY KEY (id),
    UNIQUE (session_id),
    FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID
);
