-- ==============================================================================
-- SUPABASE COMPLETE DESTRUCTIVE SETUP: SCHEMA + STORAGE BUCKET & POLICIES
-- ==============================================================================

-- ==============================================================================
-- PART 1: TOTALLY DESTRUCTIVE SCHEMA REBUILD
-- ==============================================================================

-- 0. TOTALLY DESTRUCTIVE CLEANUP
-- Note: We do NOT issue DROP TRIGGER ... ON <table> or DROP POLICY ... ON <table>
-- here because PostgreSQL raises 42P01 if the table does not yet exist.
-- DROP TABLE ... CASCADE below automatically removes all triggers and policies.

DROP FUNCTION IF EXISTS public.gross_weight(weighments) CASCADE;
DROP FUNCTION IF EXISTS public.tare_weight(weighments) CASCADE;
DROP FUNCTION IF EXISTS public.net_weight(weighments) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_set_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.reset_table_sequence(text) CASCADE;
DROP FUNCTION IF EXISTS public.reset_all_sequences() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_invalidate_sessions_on_user_update() CASCADE;

DROP EXTENSION IF EXISTS pg_trgm CASCADE;

DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS weighments CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS centers CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS factories CASCADE;

DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS weighment_type CASCADE;
DROP TYPE IF EXISTS field_requirement_mode CASCADE;
DROP TYPE IF EXISTS unit_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;

DROP SEQUENCE IF EXISTS tickets_id_seq CASCADE;
DROP SEQUENCE IF EXISTS weighments_id_seq CASCADE;
DROP SEQUENCE IF EXISTS entries_id_seq CASCADE;
DROP SEQUENCE IF EXISTS sessions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS customers_id_seq CASCADE;
DROP SEQUENCE IF EXISTS centers_id_seq CASCADE;
DROP SEQUENCE IF EXISTS commodities_id_seq CASCADE;
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS factories_id_seq CASCADE;

-- ==============================================================================
-- 1. EXTENSIONS & TYPES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('admin', 'manager', 'operator', 'base', 'hardware', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_enum') THEN
        CREATE TYPE unit_enum AS ENUM ('kg', 'q', 'gal');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weighment_type') THEN
        CREATE TYPE weighment_type AS ENUM ('unassigned', 'in', 'out');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS factories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    receipt_images_per_row INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_receipt_images_per_row CHECK (receipt_images_per_row BETWEEN 1 AND 6)
);

CREATE TABLE IF NOT EXISTS centers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_centers_factory_name
ON centers (factory_id, name)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    password_hash TEXT,
    name TEXT NOT NULL,
    role role_enum NOT NULL DEFAULT 'base',
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_staff_credentials CHECK (
        role = 'customer' OR (username IS NOT NULL AND password_hash IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active 
ON users (username) 
WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS commodities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commodities_name_active
ON commodities (name)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS entries (
    id SERIAL PRIMARY KEY,
    detected_vehicle_number TEXT,
    vehicle_number TEXT NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    center_id INT NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
    customer_id INT REFERENCES users(id) ON DELETE RESTRICT,
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_entries_weight_positive CHECK (weight > 0)
);

CREATE INDEX IF NOT EXISTS idx_entries_factory_vehicle 
ON entries (factory_id, vehicle_number, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_factory_center_created
ON entries (factory_id, center_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_factory_created
ON entries (factory_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_created_by
ON entries (factory_id, created_by)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_center
ON entries (factory_id, center_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_customer
ON entries (factory_id, customer_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entries_vehicle_trgm
ON entries USING gin (vehicle_number gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS weighments (
    id SERIAL PRIMARY KEY,
    in_entry_id INT NOT NULL UNIQUE REFERENCES entries(id) ON DELETE RESTRICT,
    out_entry_id INT NOT NULL UNIQUE REFERENCES entries(id) ON DELETE RESTRICT,
    unit unit_enum NOT NULL DEFAULT 'kg',
    type weighment_type NOT NULL DEFAULT 'unassigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_weighments_distinct_entries CHECK (in_entry_id <> out_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_weighments_created
ON weighments (created_at DESC)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    concern TEXT NOT NULL,
    reply TEXT,
    status ticket_status NOT NULL DEFAULT 'pending',
    entry_id INT REFERENCES entries(id) ON DELETE CASCADE,
    weighment_id INT REFERENCES weighments(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_ticket_link_one_only CHECK (
        (entry_id IS NOT NULL AND weighment_id IS NULL) OR
        (entry_id IS NULL AND weighment_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_status 
ON tickets (user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_entry 
ON tickets (entry_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_weighment 
ON tickets (weighment_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_created_desc
ON tickets (created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_search_trgm
ON tickets USING gin (concern gin_trgm_ops, reply gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_search_trgm
ON users USING gin (name gin_trgm_ops, username gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_centers_factory
ON centers (factory_id)
WHERE deleted_at IS NULL;

-- COMPUTED COLUMNS FOR WEIGHMENTS
CREATE OR REPLACE FUNCTION gross_weight(w weighments) 
RETURNS numeric 
LANGUAGE sql 
STABLE PARALLEL SAFE
AS $$
    SELECT GREATEST(e1.weight, e2.weight)
    FROM entries e1, entries e2
    WHERE e1.id = w.in_entry_id AND e2.id = w.out_entry_id;
$$;

CREATE OR REPLACE FUNCTION tare_weight(w weighments) 
RETURNS numeric 
LANGUAGE sql 
STABLE PARALLEL SAFE
AS $$
    SELECT LEAST(e1.weight, e2.weight)
    FROM entries e1, entries e2
    WHERE e1.id = w.in_entry_id AND e2.id = w.out_entry_id;
$$;

CREATE OR REPLACE FUNCTION net_weight(w weighments) 
RETURNS numeric 
LANGUAGE sql 
STABLE PARALLEL SAFE
AS $$
    SELECT ABS(e1.weight - e2.weight)
    FROM entries e1, entries e2
    WHERE e1.id = w.in_entry_id AND e2.id = w.out_entry_id;
$$;

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- APPLY TRIGGERS
CREATE TRIGGER trg_factories_updated_at
BEFORE UPDATE ON factories
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_centers_updated_at
BEFORE UPDATE ON centers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_commodities_updated_at
BEFORE UPDATE ON commodities
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_entries_updated_at
BEFORE UPDATE ON entries
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_weighments_updated_at
BEFORE UPDATE ON weighments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ENABLE RLS
ALTER TABLE IF EXISTS factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weighments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Allow access factories" ON factories FOR ALL USING (true);
CREATE POLICY "Allow access users" ON users FOR ALL USING (true);
CREATE POLICY "Allow access sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow access centers" ON centers FOR ALL USING (true);
CREATE POLICY "Allow access commodities" ON commodities FOR ALL USING (true);
CREATE POLICY "Allow access weighments" ON weighments FOR ALL USING (true);
CREATE POLICY "Allow access entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow access tickets" ON tickets FOR ALL USING (true);

-- SEQUENCE RESET FUNCTIONS
CREATE OR REPLACE FUNCTION reset_table_sequence(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seq_name text;
BEGIN
    seq_name := pg_get_serial_sequence(table_name, 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, 1, false);
    ELSE
        EXECUTE format('ALTER SEQUENCE IF EXISTS %I_id_seq RESTART WITH 1', table_name);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION reset_all_sequences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t text;
    tbls text[] := ARRAY['tickets', 'weighments', 'entries', 'sessions', 'commodities', 'centers', 'users', 'factories'];
    seq_name text;
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        seq_name := pg_get_serial_sequence(t, 'id');
        IF seq_name IS NOT NULL THEN
            PERFORM setval(seq_name, 1, false);
        ELSE
            EXECUTE format('ALTER SEQUENCE IF EXISTS %I_id_seq RESTART WITH 1', t);
        END IF;
    END LOOP;
END;
$$;

-- SESSION INVALIDATION TRIGGER
CREATE OR REPLACE FUNCTION trigger_invalidate_sessions_on_user_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.password_hash <> OLD.password_hash)
       OR (NEW.username <> OLD.username)
       OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE sessions
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE user_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_sessions_on_user_update
AFTER UPDATE OF password_hash, deleted_at, username ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_invalidate_sessions_on_user_update();

-- NOTIFY POSTGREST TO RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- PART 2: STORAGE BUCKET & POLICIES SETUP
-- Target Bucket: 'gluvok'
--
-- NOTE: Supabase blocks direct DELETE from storage.buckets / storage.objects
-- via SQL (function storage.protect_delete). To purge bucket contents, use the
-- Storage API or the Supabase dashboard MANUALLY before running this script.
-- This script only ensures bucket config and resets policies (safe, idempotent).
-- ==============================================================================

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('gluvok', 'gluvok', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop all existing policies on storage.objects for this bucket
DROP POLICY IF EXISTS "Public Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow read access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access for gluvok bucket" ON storage.objects;

-- 3. Recreate policies

-- INSERT: restricted to authenticated and service_role, prefix must be numeric factory_id
CREATE POLICY "Allow insert access for gluvok bucket"
ON storage.objects FOR INSERT TO authenticated, service_role
WITH CHECK (
    bucket_id = 'gluvok' AND
    name ~ '^[0-9]+/[^/]+$'
);

-- UPDATE: restricted to authenticated and service_role
CREATE POLICY "Allow update access for gluvok bucket"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (bucket_id = 'gluvok')
WITH CHECK (bucket_id = 'gluvok');

-- DELETE: restricted to authenticated and service_role
CREATE POLICY "Allow delete access for gluvok bucket"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (bucket_id = 'gluvok');

-- NOTE: No SELECT policy is created. The bucket is public, so individual files
-- can be accessed via their public CDN URL without a SELECT policy. This prevents
-- clients from listing/enumerating all files in the bucket.