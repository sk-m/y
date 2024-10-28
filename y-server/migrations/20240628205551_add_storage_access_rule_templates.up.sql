CREATE TABLE public.storage_access_templates
(
    id serial NOT NULL,
    name character varying(128) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.storage_access_template_rules
(
    id serial NOT NULL,
    template_id integer NOT NULL,
    access_type storage_access_type NOT NULL,
    action storage_access_action_type NOT NULL,
    executor_type storage_access_executor_type NOT NULL,
    executor_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT storage_access_template_unique_key UNIQUE (template_id, action, executor_type, executor_id),
    CONSTRAINT storage_access_template_id_fkey FOREIGN KEY (template_id)
        REFERENCES public.storage_access_templates (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE CASCADE
        NOT VALID
);

CREATE TABLE public.storage_access_template_entries
(
    entry_endpoint_id integer NOT NULL,
    entry_id bigint NOT NULL,
    template_id integer NOT NULL,
    PRIMARY KEY (entry_endpoint_id, entry_id, template_id),
    CONSTRAINT storage_access_entry_endpoint_id_fkey FOREIGN KEY (entry_endpoint_id)
        REFERENCES public.storage_endpoints (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE CASCADE
        NOT VALID,
    CONSTRAINT storage_access_entry_id_fkey FOREIGN KEY (entry_id)
        REFERENCES public.storage_entries (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE CASCADE
        NOT VALID,
    CONSTRAINT storage_access_template_id_fkey FOREIGN KEY (template_id)
        REFERENCES public.storage_access_templates (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE CASCADE
        NOT VALID
);
