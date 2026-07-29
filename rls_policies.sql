-- rls_policies.sql
-- Disable RLS and drop all legacy policies (backend API / Drizzle architecture)

-- 1. Schema Updates
ALTER TABLE customers ADD COLUMN IF NOT EXISTS factory_id int REFERENCES factories(id) ON DELETE RESTRICT;
ALTER TABLE weighments ADD COLUMN IF NOT EXISTS unit unit_enum NOT NULL DEFAULT 'kg';

-- 2. Drop Obsolete Views if present
DROP VIEW IF EXISTS profiles_with_email CASCADE;
DROP VIEW IF EXISTS profiles_with_username CASCADE;

-- 3. Drop all policies and DISABLE Row Level Security on all tables
-- Users
DROP POLICY IF EXISTS "users_all_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_modify_policy" ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_isolation_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_modify_policy" ON profiles;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Customers
DROP POLICY IF EXISTS "customers_isolation_policy" ON customers;
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_modify_policy" ON customers;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Factories
DROP POLICY IF EXISTS "factories_isolation_policy" ON factories;
DROP POLICY IF EXISTS "factories_select_policy" ON factories;
DROP POLICY IF EXISTS "factories_modify_policy" ON factories;
ALTER TABLE factories DISABLE ROW LEVEL SECURITY;

-- Centers
DROP POLICY IF EXISTS "centers_isolation_policy" ON centers;
DROP POLICY IF EXISTS "centers_select_policy" ON centers;
DROP POLICY IF EXISTS "centers_modify_policy" ON centers;
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;

-- Rates
DROP POLICY IF EXISTS "rates_isolation_policy" ON rates;
DROP POLICY IF EXISTS "rates_select_policy" ON rates;
DROP POLICY IF EXISTS "rates_modify_policy" ON rates;
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;

-- Weighments
DROP POLICY IF EXISTS "weighments_isolation_policy" ON weighments;
DROP POLICY IF EXISTS "weighments_select_policy" ON weighments;
DROP POLICY IF EXISTS "weighments_modify_policy" ON weighments;
ALTER TABLE weighments DISABLE ROW LEVEL SECURITY;

-- Commodities
DROP POLICY IF EXISTS "commodities_isolation_policy" ON commodities;
DROP POLICY IF EXISTS "commodities_select_policy" ON commodities;
DROP POLICY IF EXISTS "commodities_all_policy" ON commodities;
DROP POLICY IF EXISTS "commodities_modify_policy" ON commodities;
ALTER TABLE commodities DISABLE ROW LEVEL SECURITY;
