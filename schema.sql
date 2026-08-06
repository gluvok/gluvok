-- ==============================================================================
-- SUPABASE COMPLETE DATABASE SCHEMA & RLS SETUP
-- Idempotent PostgreSQL / Supabase Schema Definition
-- ==============================================================================

-- 1. CREATE ENUM TYPES (IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('admin', 'manager', 'operator', 'base');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_enum') THEN
        CREATE TYPE unit_enum AS ENUM ('kg', 'q', 'gal');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weighment_type') THEN
        CREATE TYPE weighment_type AS ENUM ('in', 'out');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_requirement_mode') THEN
        CREATE TYPE field_requirement_mode AS ENUM ('mandatory', 'optional', 'not_required');
    END IF;
END $$;

-- 2. CREATE TABLES

-- FACTORIES TABLE (Contains factory details & requirement mode settings)
CREATE TABLE IF NOT EXISTS factories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    aadhar_number_mode field_requirement_mode NOT NULL DEFAULT 'mandatory',
    govt_id_mode field_requirement_mode NOT NULL DEFAULT 'mandatory',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USERS TABLE (Custom authentication table)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role role_enum NOT NULL DEFAULT 'base',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    aadhar_number TEXT,
    role role_enum NOT NULL DEFAULT 'operator',
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    govt_id INT,
    name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CENTERS TABLE
CREATE TABLE IF NOT EXISTS centers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMODITIES TABLE
CREATE TABLE IF NOT EXISTS commodities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RATES TABLE
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    commodity_id INT NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    unit_price NUMERIC(10, 2) NOT NULL,
    unit unit_enum NOT NULL DEFAULT 'kg',
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WEIGHMENTS TABLE
CREATE TABLE IF NOT EXISTS weighments (
    id SERIAL PRIMARY KEY,
    vehicle_number TEXT NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    unit unit_enum NOT NULL DEFAULT 'kg',
    type weighment_type NOT NULL DEFAULT 'in',
    rate_id INT REFERENCES rates(id) ON DELETE RESTRICT,
    center_id INT NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
    profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    customer_id INT REFERENCES customers(id) ON DELETE RESTRICT,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weighments ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- USERS TABLE POLICIES
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

-- FACTORIES TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Factories" ON factories;
CREATE POLICY "Strict Factory Multi-Tenancy Factories"
ON factories FOR ALL
TO authenticated
USING (id = (auth.jwt() ->> 'factory_id')::int);

-- PROFILES TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Profiles" ON profiles;
CREATE POLICY "Strict Factory Multi-Tenancy Profiles"
ON profiles FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- CUSTOMERS TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Customers" ON customers;
CREATE POLICY "Strict Factory Multi-Tenancy Customers"
ON customers FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- CENTERS TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Centers" ON centers;
CREATE POLICY "Strict Factory Multi-Tenancy Centers"
ON centers FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- COMMODITIES TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Commodities" ON commodities;
CREATE POLICY "Strict Factory Multi-Tenancy Commodities"
ON commodities FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- RATES TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Rates" ON rates;
CREATE POLICY "Strict Factory Multi-Tenancy Rates"
ON rates FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- WEIGHMENTS TABLE POLICY
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Weighments" ON weighments;
CREATE POLICY "Strict Factory Multi-Tenancy Weighments"
ON weighments FOR ALL
TO authenticated
USING (factory_id = (auth.jwt() ->> 'factory_id')::int);

-- 5. AUTO-INCREMENT SEQUENCE RESET FUNCTIONS
CREATE OR REPLACE FUNCTION reset_table_sequence(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seq_name text;
BEGIN
    seq_name := pg_get_serial_sequence(table_name, 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, 1, false);
    ELSE
        EXECUTE format('ALTER SEQUENCE IF EXISTS %I_id_seq RESTART WITH 1', table_name);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION reset_all_sequences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t text;
    tbls text[] := ARRAY['weighments', 'rates', 'customers', 'profiles', 'commodities', 'centers', 'users', 'factories'];
    seq_name text;
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        seq_name := pg_get_serial_sequence(t, 'id');
        IF seq_name IS NOT NULL THEN
            PERFORM setval(seq_name, 1, false);
        ELSE
            EXECUTE format('ALTER SEQUENCE IF EXISTS %I_id_seq RESTART WITH 1', t);
        END IF;
    END LOOP;
END;
$$;

