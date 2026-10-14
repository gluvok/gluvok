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


