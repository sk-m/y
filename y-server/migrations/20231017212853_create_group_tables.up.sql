CREATE TABLE IF NOT EXISTS public.user_groups
(
    id serial NOT NULL,
    name character varying(256) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_group_membership
(
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID,
    FOREIGN KEY (group_id)
        REFERENCES public.user_groups (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID
);

CREATE TABLE IF NOT EXISTS public.user_group_rights
(
    group_id integer NOT NULL,
    right_name character varying(256) NOT NULL,
    right_options jsonb NOT NULL,
    PRIMARY KEY (group_id, right_name),
    FOREIGN KEY (group_id)
        REFERENCES public.user_groups (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
        NOT VALID
);
