CREATE TABLE IF NOT EXISTS public.features
(
    feature character varying(128) NOT NULL,
    enabled boolean NOT NULL,
    PRIMARY KEY (feature)
);