-- Migration: Drop camera_crops column from factories
ALTER TABLE factories DROP COLUMN IF EXISTS camera_crops;

-- Migration: Drop check_center_on_merge column from factories
ALTER TABLE factories DROP COLUMN IF EXISTS check_center_on_merge;

-- Migration: Remove auto_approve from centers
ALTER TABLE centers DROP COLUMN IF EXISTS auto_approve;

-- Migration: Remove status, auto_approved, and approved_by from entries
DROP INDEX IF EXISTS idx_entries_approved_by;
DROP INDEX IF EXISTS idx_entries_fifo_approval;
DROP INDEX IF EXISTS idx_entries_factory_vehicle;

ALTER TABLE entries DROP COLUMN IF EXISTS status;
ALTER TABLE entries DROP COLUMN IF EXISTS auto_approved;
ALTER TABLE entries DROP COLUMN IF EXISTS approved_by;

DROP TYPE IF EXISTS entry_status CASCADE;

CREATE INDEX IF NOT EXISTS idx_entries_factory_vehicle
ON entries (factory_id, vehicle_number, created_at DESC)
WHERE deleted_at IS NULL;

-- Migration: Add customer role to users, drop customers table, and link entries.customer_id to users
ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'customer';

ALTER TABLE users DROP COLUMN IF EXISTS father_name;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'entries' AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%customer%'
    ) LOOP
        EXECUTE 'ALTER TABLE entries DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.create_customer_with_user CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_with_user CASCADE;
DROP FUNCTION IF EXISTS public.delete_customers_with_user CASCADE;

DROP TABLE IF EXISTS customers CASCADE;
DROP SEQUENCE IF EXISTS customers_id_seq CASCADE;

ALTER TABLE entries ADD CONSTRAINT entries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Migration: Allow optional portal credentials for customers while enforcing for staff
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
DROP INDEX IF EXISTS idx_users_username_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active ON users (username) WHERE deleted_at IS NULL AND username IS NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_staff_credentials;
ALTER TABLE users ADD CONSTRAINT chk_staff_credentials CHECK (role = 'customer' OR (username IS NOT NULL AND password_hash IS NOT NULL));

-- Migration: Create devices table (1:1 with centers)
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    center_id INT NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
    api_key_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_center_active
ON devices (center_id)
WHERE deleted_at IS NULL;

-- Migration: Split entries into manual_entries and automatic_entries
CREATE TABLE IF NOT EXISTS manual_entries (
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
    CONSTRAINT chk_manual_entries_weight_positive CHECK (weight > 0)
);

CREATE TABLE IF NOT EXISTS automatic_entries (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    center_id INT NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
    customer_id INT REFERENCES users(id) ON DELETE RESTRICT,
    detected_vehicle_number TEXT,
    vehicle_number TEXT NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_automatic_entries_weight_positive CHECK (weight > 0)
);

-- Migration: Split weighments into manual_weighments and automatic_weighments
CREATE TABLE IF NOT EXISTS manual_weighments (
    id SERIAL PRIMARY KEY,
    in_entry_id INT NOT NULL UNIQUE REFERENCES manual_entries(id) ON DELETE RESTRICT,
    out_entry_id INT NOT NULL UNIQUE REFERENCES manual_entries(id) ON DELETE RESTRICT,
    unit unit_enum NOT NULL DEFAULT 'kg',
    type weighment_type NOT NULL DEFAULT 'unassigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_manual_weighments_distinct_entries CHECK (in_entry_id <> out_entry_id)
);

CREATE TABLE IF NOT EXISTS automatic_weighments (
    id SERIAL PRIMARY KEY,
    in_entry_id INT NOT NULL UNIQUE REFERENCES automatic_entries(id) ON DELETE RESTRICT,
    out_entry_id INT NOT NULL UNIQUE REFERENCES automatic_entries(id) ON DELETE RESTRICT,
    unit unit_enum NOT NULL DEFAULT 'kg',
    type weighment_type NOT NULL DEFAULT 'unassigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_automatic_weighments_distinct_entries CHECK (in_entry_id <> out_entry_id)
);

-- Migration: Split tickets into manual_tickets and automatic_tickets
CREATE TABLE IF NOT EXISTS manual_tickets (
    id SERIAL PRIMARY KEY,
    concern TEXT NOT NULL,
    reply TEXT,
    status ticket_status NOT NULL DEFAULT 'pending',
    entry_id INT REFERENCES manual_entries(id) ON DELETE CASCADE,
    weighment_id INT REFERENCES manual_weighments(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_manual_ticket_link_one_only CHECK (
        (entry_id IS NOT NULL AND weighment_id IS NULL) OR
        (entry_id IS NULL AND weighment_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS automatic_tickets (
    id SERIAL PRIMARY KEY,
    concern TEXT NOT NULL,
    reply TEXT,
    status ticket_status NOT NULL DEFAULT 'pending',
    entry_id INT REFERENCES automatic_entries(id) ON DELETE CASCADE,
    weighment_id INT REFERENCES automatic_weighments(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    device_id INT REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_automatic_ticket_link_one_only CHECK (
        (entry_id IS NOT NULL AND weighment_id IS NULL) OR
        (entry_id IS NULL AND weighment_id IS NOT NULL)
    )
);

-- Migration: Refine manual_entries schema (drop factory_id and detected_vehicle_number)
ALTER TABLE IF EXISTS manual_entries DROP COLUMN IF EXISTS detected_vehicle_number;
ALTER TABLE IF EXISTS manual_entries DROP COLUMN IF EXISTS factory_id;

DROP INDEX IF EXISTS idx_manual_entries_factory_vehicle;
DROP INDEX IF EXISTS idx_manual_entries_factory_center_created;
DROP INDEX IF EXISTS idx_manual_entries_factory_created;
DROP INDEX IF EXISTS idx_manual_entries_created_by;
DROP INDEX IF EXISTS idx_manual_entries_center;
DROP INDEX IF EXISTS idx_manual_entries_customer;

CREATE INDEX IF NOT EXISTS idx_manual_entries_center_vehicle 
ON manual_entries (center_id, vehicle_number, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manual_entries_created_at
ON manual_entries (created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manual_entries_created_by
ON manual_entries (created_by)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manual_entries_center
ON manual_entries (center_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manual_entries_customer
ON manual_entries (customer_id)
WHERE deleted_at IS NULL;
