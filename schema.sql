-- ==============================================================================
-- SUPABASE COMPLETE DATABASE SCHEMA & RLS SETUP
-- Destructive & Idempotent PostgreSQL / Supabase Schema Definition
-- ==============================================================================

-- 0. DESTRUCTIVE CLEANUP (Drop existing tables, types, and views to ensure a fresh schema build)
DROP TABLE IF EXISTS weighments CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS rates CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS centers CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS factories CASCADE;

DROP TYPE IF EXISTS entry_type CASCADE;
DROP TYPE IF EXISTS entry_status CASCADE;
DROP TYPE IF EXISTS weighment_type CASCADE;
DROP TYPE IF EXISTS field_requirement_mode CASCADE;
DROP TYPE IF EXISTS unit_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;

-- 1. CREATE ENUM TYPES (IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('admin', 'manager', 'operator', 'base');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_enum') THEN
        CREATE TYPE unit_enum AS ENUM ('kg', 'q', 'gal');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_type') THEN
        CREATE TYPE entry_type AS ENUM ('manual', 'automatic');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weighment_type') THEN
        CREATE TYPE weighment_type AS ENUM ('unassigned', 'in', 'out');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_requirement_mode') THEN
        CREATE TYPE field_requirement_mode AS ENUM ('mandatory', 'optional', 'not_required');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_status') THEN
        CREATE TYPE entry_status AS ENUM ('pending', 'approved', 'rejected');
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
    token_version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
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
    user_id INT REFERENCES users(id) ON DELETE RESTRICT,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CENTERS TABLE
CREATE TABLE IF NOT EXISTS centers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMODITIES TABLE
CREATE TABLE IF NOT EXISTS commodities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RATES TABLE
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    commodity_id INT NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    unit_price NUMERIC(10, 2) NOT NULL,
    unit unit_enum NOT NULL DEFAULT 'kg',
    factory_id INT NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ENTRIES TABLE (Raw weighment events)
CREATE TABLE IF NOT EXISTS entries (
    id SERIAL PRIMARY KEY,
    detected_vehicle_number TEXT,
    vehicle_number TEXT NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    type entry_type NOT NULL DEFAULT 'automatic',
    center_id INT NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
    profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    customer_id INT REFERENCES customers(id) ON DELETE RESTRICT,
    factory_id INT REFERENCES factories(id) ON DELETE RESTRICT,
    status entry_status NOT NULL DEFAULT 'pending',
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_factory_vehicle 
ON entries (factory_id, vehicle_number, type, status, created_at DESC);

-- WEIGHMENTS TABLE (Merged double-entry pair)
CREATE TABLE IF NOT EXISTS weighments (
    id SERIAL PRIMARY KEY,
    in_entry_id INT NOT NULL UNIQUE REFERENCES entries(id) ON DELETE RESTRICT,
    out_entry_id INT NOT NULL UNIQUE REFERENCES entries(id) ON DELETE RESTRICT,
    unit unit_enum NOT NULL DEFAULT 'kg',
    type weighment_type NOT NULL DEFAULT 'unassigned',
    rate_id INT REFERENCES rates(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPUTED COLUMNS FOR WEIGHMENTS DERIVED WEIGHTS (Enables PostgREST DB-level ORDER BY for gross_weight, tare_weight, net_weight)
DROP FUNCTION IF EXISTS public.gross_weight(weighments);
CREATE OR REPLACE FUNCTION gross_weight(w weighments) 
RETURNS numeric 
LANGUAGE plpgsql 
STABLE
AS $$
BEGIN
    RETURN (
        SELECT GREATEST(e1.weight, e2.weight)
        FROM entries e1
        JOIN entries e2 ON e2.id = w.out_entry_id
        WHERE e1.id = w.in_entry_id
    );
END;
$$;

DROP FUNCTION IF EXISTS public.tare_weight(weighments);
CREATE OR REPLACE FUNCTION tare_weight(w weighments) 
RETURNS numeric 
LANGUAGE plpgsql 
STABLE
AS $$
BEGIN
    RETURN (
        SELECT LEAST(e1.weight, e2.weight)
        FROM entries e1
        JOIN entries e2 ON e2.id = w.out_entry_id
        WHERE e1.id = w.in_entry_id
    );
END;
$$;

DROP FUNCTION IF EXISTS public.net_weight(weighments);
CREATE OR REPLACE FUNCTION net_weight(w weighments) 
RETURNS numeric 
LANGUAGE plpgsql 
STABLE
AS $$
BEGIN
    RETURN (
        SELECT ABS(e1.weight - e2.weight)
        FROM entries e1
        JOIN entries e2 ON e2.id = w.out_entry_id
        WHERE e1.id = w.in_entry_id
    );
END;
$$;

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE IF EXISTS factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weighments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entries ENABLE ROW LEVEL SECURITY;

-- 4. THIN RLS POLICIES (Access control & tenant isolation managed in backend Next.js API)
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
DROP POLICY IF EXISTS "Strict Factory Multi-Tenancy Entries" ON entries;

DROP POLICY IF EXISTS "Allow access factories" ON factories;
DROP POLICY IF EXISTS "Allow access users" ON users;
DROP POLICY IF EXISTS "Allow access profiles" ON profiles;
DROP POLICY IF EXISTS "Allow access customers" ON customers;
DROP POLICY IF EXISTS "Allow access centers" ON centers;
DROP POLICY IF EXISTS "Allow access commodities" ON commodities;
DROP POLICY IF EXISTS "Allow access rates" ON rates;
DROP POLICY IF EXISTS "Allow access weighments" ON weighments;
DROP POLICY IF EXISTS "Allow access entries" ON entries;

CREATE POLICY "Allow access factories" ON factories FOR ALL USING (true);
CREATE POLICY "Allow access users" ON users FOR ALL USING (true);
CREATE POLICY "Allow access profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow access customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow access centers" ON centers FOR ALL USING (true);
CREATE POLICY "Allow access commodities" ON commodities FOR ALL USING (true);
CREATE POLICY "Allow access rates" ON rates FOR ALL USING (true);
CREATE POLICY "Allow access weighments" ON weighments FOR ALL USING (true);
CREATE POLICY "Allow access entries" ON entries FOR ALL USING (true);

-- 5. AUTO-INCREMENT SEQUENCE RESET FUNCTIONS
DROP FUNCTION IF EXISTS public.reset_table_sequence(text);
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

DROP FUNCTION IF EXISTS public.reset_all_sequences();
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

-- 6. ATOMIC TRANSACTION RPC FUNCTIONS FOR CUSTOMERS & USERS

DROP FUNCTION IF EXISTS public.create_customer_with_user(TEXT, TEXT, INT, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public.create_customer_with_user(INT, TEXT, TEXT, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_customer_with_user(
    p_factory_id INT,
    p_name TEXT,
    p_father_name TEXT,
    p_govt_id INT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_password_hash TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INT := NULL;
    v_customer_id INT;
    v_result JSON;
BEGIN
    IF p_username IS NOT NULL AND p_password_hash IS NOT NULL THEN
        INSERT INTO users (username, password_hash, role, factory_id)
        VALUES (p_username, p_password_hash, 'base', p_factory_id)
        RETURNING id INTO v_user_id;
    END IF;

    INSERT INTO customers (name, father_name, govt_id, user_id, factory_id)
    VALUES (p_name, p_father_name, p_govt_id, v_user_id, p_factory_id)
    RETURNING id INTO v_customer_id;

    SELECT row_to_json(c) INTO v_result
    FROM (
        SELECT 
            cust.*,
            CASE WHEN u.id IS NOT NULL THEN
                json_build_object('username', u.username, 'is_active', u.is_active)
            ELSE NULL END AS users
        FROM customers cust
        LEFT JOIN users u ON cust.user_id = u.id
        WHERE cust.id = v_customer_id
    ) c;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.update_customer_with_user(INT, INT, TEXT, TEXT, INT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION update_customer_with_user(
    p_customer_id INT,
    p_factory_id INT,
    p_name TEXT DEFAULT NULL,
    p_father_name TEXT DEFAULT NULL,
    p_govt_id INT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_password_hash TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INT;
    v_result JSON;
BEGIN
    SELECT user_id INTO v_user_id
    FROM customers
    WHERE id = p_customer_id AND factory_id = p_factory_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    UPDATE customers
    SET 
        name = COALESCE(p_name, name),
        father_name = COALESCE(p_father_name, father_name),
        govt_id = CASE WHEN p_govt_id IS NOT NULL THEN p_govt_id ELSE govt_id END,
        updated_at = NOW()
    WHERE id = p_customer_id AND factory_id = p_factory_id;

    IF v_user_id IS NOT NULL THEN
        UPDATE users
        SET 
            username = COALESCE(p_username, username),
            password_hash = COALESCE(p_password_hash, password_hash),
            token_version = CASE WHEN p_password_hash IS NOT NULL THEN token_version + 1 ELSE token_version END,
            is_active = COALESCE(p_is_active, is_active),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSIF p_username IS NOT NULL AND p_password_hash IS NOT NULL THEN
        INSERT INTO users (username, password_hash, role, factory_id)
        VALUES (p_username, p_password_hash, 'base', p_factory_id)
        RETURNING id INTO v_user_id;

        UPDATE customers
        SET user_id = v_user_id
        WHERE id = p_customer_id;
    END IF;

    SELECT row_to_json(c) INTO v_result
    FROM (
        SELECT 
            cust.*,
            CASE WHEN u.id IS NOT NULL THEN
                json_build_object('username', u.username, 'is_active', u.is_active)
            ELSE NULL END AS users
        FROM customers cust
        LEFT JOIN users u ON cust.user_id = u.id
        WHERE cust.id = p_customer_id
    ) c;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_customers_with_user(INT[], INT);

CREATE OR REPLACE FUNCTION delete_customers_with_user(
    p_customer_ids INT[],
    p_factory_id INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_ids INT[];
    v_deleted_count INT;
BEGIN
    SELECT ARRAY_AGG(user_id) INTO v_user_ids
    FROM customers
    WHERE id = ANY(p_customer_ids) AND factory_id = p_factory_id AND user_id IS NOT NULL;

    DELETE FROM customers
    WHERE id = ANY(p_customer_ids) AND factory_id = p_factory_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        DELETE FROM users WHERE id = ANY(v_user_ids);
    END IF;

    RETURN v_deleted_count;
END;
$$;

-- 7. ATOMIC TRANSACTION RPC FUNCTIONS FOR PROFILES & USERS

DROP FUNCTION IF EXISTS public.create_profile_with_user(INT, TEXT, TEXT, TEXT, role_enum, TEXT);

CREATE OR REPLACE FUNCTION create_profile_with_user(
    p_factory_id INT,
    p_name TEXT,
    p_username TEXT,
    p_password_hash TEXT,
    p_role role_enum DEFAULT 'operator',
    p_aadhar_number TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INT;
    v_profile_id INT;
    v_result JSON;
BEGIN
    INSERT INTO users (username, password_hash, role, factory_id)
    VALUES (p_username, p_password_hash, p_role, p_factory_id)
    RETURNING id INTO v_user_id;

    INSERT INTO profiles (user_id, name, aadhar_number, role, factory_id)
    VALUES (v_user_id, p_name, p_aadhar_number, p_role, p_factory_id)
    RETURNING id INTO v_profile_id;

    SELECT row_to_json(p) INTO v_result
    FROM (
        SELECT 
            prof.*,
            u.username,
            u.is_active
        FROM profiles prof
        JOIN users u ON prof.user_id = u.id
        WHERE prof.id = v_profile_id
    ) p;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.update_profile_with_user(INT, INT, TEXT, role_enum, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION update_profile_with_user(
    p_profile_id INT,
    p_factory_id INT,
    p_name TEXT DEFAULT NULL,
    p_role role_enum DEFAULT NULL,
    p_aadhar_number TEXT DEFAULT NULL,
    p_password_hash TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INT;
    v_result JSON;
BEGIN
    SELECT user_id INTO v_user_id
    FROM profiles
    WHERE id = p_profile_id AND factory_id = p_factory_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    UPDATE profiles
    SET 
        name = COALESCE(p_name, name),
        role = COALESCE(p_role, role),
        aadhar_number = CASE WHEN p_aadhar_number IS NOT NULL THEN p_aadhar_number ELSE aadhar_number END,
        updated_at = NOW()
    WHERE id = p_profile_id AND factory_id = p_factory_id;

    UPDATE users
    SET 
        role = COALESCE(p_role, role),
        password_hash = COALESCE(p_password_hash, password_hash),
        token_version = CASE WHEN p_password_hash IS NOT NULL THEN token_version + 1 ELSE token_version END,
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = v_user_id;

    SELECT row_to_json(p) INTO v_result
    FROM (
        SELECT 
            prof.*,
            u.username,
            u.is_active
        FROM profiles prof
        JOIN users u ON prof.user_id = u.id
        WHERE prof.id = p_profile_id
    ) p;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_profiles_with_user(INT[], INT);

CREATE OR REPLACE FUNCTION delete_profiles_with_user(
    p_profile_ids INT[],
    p_factory_id INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_ids INT[];
    v_deleted_count INT;
BEGIN
    SELECT ARRAY_AGG(user_id) INTO v_user_ids
    FROM profiles
    WHERE id = ANY(p_profile_ids) AND factory_id = p_factory_id;

    DELETE FROM profiles
    WHERE id = ANY(p_profile_ids) AND factory_id = p_factory_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        DELETE FROM users WHERE id = ANY(v_user_ids);
    END IF;

    RETURN v_deleted_count;
END;
$$;

-- 8. NOTIFY SUPABASE POSTGREST TO RELOAD SCHEMA CACHE IMMEDIATELY
NOTIFY pgrst, 'reload schema';


