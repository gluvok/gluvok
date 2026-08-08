-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- Thin RLS Script (Access control & tenant isolation managed in backend Next.js API)
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE IF EXISTS factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weighments ENABLE ROW LEVEL SECURITY;

-- 2. DROP OLD COMPLEX POLICIES
DROP POLICY IF EXISTS "Allow Read Users" ON users;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Users Write" ON users;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Factories" ON factories;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Profiles" ON profiles;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Customers" ON customers;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Centers" ON centers;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Read Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Write Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Commodities Access" ON commodities;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Rates" ON rates;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Weighments" ON weighments;

DROP POLICY IF EXISTS "Allow access factories" ON factories;
DROP POLICY IF EXISTS "Allow access users" ON users;
DROP POLICY IF EXISTS "Allow access profiles" ON profiles;
DROP POLICY IF EXISTS "Allow access customers" ON customers;
DROP POLICY IF EXISTS "Allow access centers" ON centers;
DROP POLICY IF EXISTS "Allow access commodities" ON commodities;
DROP POLICY IF EXISTS "Allow access rates" ON rates;
DROP POLICY IF EXISTS "Allow access weighments" ON weighments;

-- 3. THIN PERMISSIVE POLICIES
CREATE POLICY "Allow access factories" ON factories FOR ALL USING (true);
CREATE POLICY "Allow access users" ON users FOR ALL USING (true);
CREATE POLICY "Allow access profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow access customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow access centers" ON centers FOR ALL USING (true);
CREATE POLICY "Allow access commodities" ON commodities FOR ALL USING (true);
CREATE POLICY "Allow access rates" ON rates FOR ALL USING (true);
CREATE POLICY "Allow access weighments" ON weighments FOR ALL USING (true);
