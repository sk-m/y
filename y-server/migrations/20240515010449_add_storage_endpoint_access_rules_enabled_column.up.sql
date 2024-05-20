ALTER TABLE IF EXISTS public.storage_endpoints
    ADD COLUMN access_rules_enabled boolean NOT NULL DEFAULT false;