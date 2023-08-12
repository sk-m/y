CREATE TABLE IF NOT EXISTS public.users
(
    id serial NOT NULL,
    username character varying(128) NOT NULL,
    password character varying(512),
    PRIMARY KEY (id),
    UNIQUE (username)
);
