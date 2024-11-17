CREATE TABLE public.storage_vfs (
	endpoint_id integer NOT NULL,
	mountpoint varchar(64) NOT NULL,
	writable boolean DEFAULT FALSE NOT NULL,
	enabled boolean DEFAULT FALSE NOT NULL,
	CONSTRAINT storage_vfs_pk PRIMARY KEY (endpoint_id),
	CONSTRAINT storage_vfs_mountpoint_unique UNIQUE (mountpoint),
	CONSTRAINT storage_vfs_storage_endpoints_fk FOREIGN KEY (endpoint_id) REFERENCES public.storage_endpoints(id) ON DELETE CASCADE
);
