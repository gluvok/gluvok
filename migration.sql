-- Migration: Drop camera_crops column from factories
ALTER TABLE factories DROP COLUMN IF EXISTS camera_crops;
