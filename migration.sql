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
