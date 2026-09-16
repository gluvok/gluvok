-- ==========================================
-- SUPABASE STORAGE BUCKET & POLICIES SETUP
-- Fully Idempotent Script (Safe to re-run)
-- Target Bucket: 'gluvok'
-- Object Key Structure:
--   <factory_id>/<file_id>.<ext>
-- ==========================================

-- 1. Create Public Storage Bucket 'gluvok'
INSERT INTO storage.buckets (id, name, public)
VALUES ('gluvok', 'gluvok', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Objects RLS Policies for 'gluvok' Bucket

-- SELECT Policy (Public read for viewing images via CDN)
DROP POLICY IF EXISTS "Public Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow read access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow read access for gluvok bucket"
ON storage.objects FOR SELECT TO anon, authenticated, service_role
USING (bucket_id = 'gluvok');

-- INSERT Policy (Prefix validated for all roles)
DROP POLICY IF EXISTS "Public Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow insert access for gluvok bucket"
ON storage.objects FOR INSERT TO anon, authenticated, service_role
WITH CHECK (
    bucket_id = 'gluvok' AND
    name ~ '^[0-9]+/[^/]+$'
);

-- UPDATE Policy
DROP POLICY IF EXISTS "Public Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow update access for gluvok bucket"
ON storage.objects FOR UPDATE TO anon, authenticated, service_role
USING (bucket_id = 'gluvok')
WITH CHECK (bucket_id = 'gluvok');

-- DELETE Policy
DROP POLICY IF EXISTS "Public Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow delete access for gluvok bucket"
ON storage.objects FOR DELETE TO anon, authenticated, service_role
USING (bucket_id = 'gluvok');
