-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- Strict Factory Multi-Tenancy RLS Script
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

-- 2. USERS TABLE: ALLOW READ FOR UNAUTHENTICATED & AUTHENTICATED
DROP POLICY IF EXISTS "Allow Read Users" ON users;
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Users Write" ON users;

CREATE POLICY "Allow Read Users"
ON users FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Strict Factory Multi-Tenancy Users Write"
ON users FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 3. FACTORIES TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Factories" ON factories;
CREATE POLICY "Strict Factory Multi-Tenancy Factories"
ON factories FOR ALL
TO authenticated
USING (id = (auth.jwt() ->> 'factory_id')::int);

-- 4. PROFILES TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Profiles" ON profiles;
CREATE POLICY "Strict Factory Multi-Tenancy Profiles"
ON profiles FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 5. CUSTOMERS TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Customers" ON customers;
CREATE POLICY "Strict Factory Multi-Tenancy Customers"
ON customers FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 6. CENTERS TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Centers" ON centers;
CREATE POLICY "Strict Factory Multi-Tenancy Centers"
ON centers FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 7. COMMODITIES TABLE: GLOBAL SHARED CATALOG (AUTHENTICATED ONLY)
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Read Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Write Commodities" ON commodities;
DROP POLICY IF EXISTS "Allow Commodities Access" ON commodities;

CREATE POLICY "Allow Commodities Access"
ON commodities FOR ALL
TO authenticated
USING (true);

-- 8. RATES TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Rates" ON rates;
CREATE POLICY "Strict Factory Multi-Tenancy Rates"
ON rates FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 9. WEIGHMENTS TABLE: STRICT FACTORY ISOLATION
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Weighments" ON weighments;
CREATE POLICY "Strict Factory Multi-Tenancy Weighments"
ON weighments FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);
