-- Migration: Drop camera_crops column from factories
ALTER TABLE factories DROP COLUMN IF EXISTS camera_crops;

-- Migration: Drop check_center_on_merge column from factories
ALTER TABLE factories DROP COLUMN IF EXISTS check_center_on_merge;

