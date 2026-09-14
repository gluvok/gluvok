-- ==========================================
-- SUPABASE STORAGE BUCKET & POLICIES SETUP
-- Fully Idempotent Script (Safe to re-run)
-- Target Bucket: 'gluvok'
-- Object Key Structure:
--   f_<factory_id>/c_<center_id>/weighments/<file_id>.<ext>
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

-- INSERT Policy (Restricted to authenticated and service_role with prefix validation)
DROP POLICY IF EXISTS "Public Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow insert access for gluvok bucket"
ON storage.objects FOR INSERT TO authenticated, service_role
WITH CHECK (
    bucket_id = 'gluvok' AND
    name ~ '^f_[0-9]+/c_[0-9]+/weighments/'
);

-- UPDATE Policy (Restricted to authenticated and service_role)
DROP POLICY IF EXISTS "Public Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow update access for gluvok bucket"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (bucket_id = 'gluvok')
WITH CHECK (bucket_id = 'gluvok');

-- DELETE Policy (Restricted to authenticated and service_role, revoked from anon)
DROP POLICY IF EXISTS "Public Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow delete access for gluvok bucket"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (bucket_id = 'gluvok');
