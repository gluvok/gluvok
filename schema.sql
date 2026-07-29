-- ==========================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA (DDL)
-- Fully Idempotent DDL (Safe to re-run)
-- ==========================================


-- 1. CUSTOM ENUM TYPES (Safe Creation)
-- -------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM (
      'super_admin',
      'admin',
      'manager',
      'operator',
      'base',
      'hardware'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_enum') THEN
    CREATE TYPE unit_enum AS ENUM (
      'kg',
      'q',
      'gal'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weighment_type') THEN
    CREATE TYPE weighment_type AS ENUM (
      'in',
      'out'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_requirement_mode') THEN
    CREATE TYPE field_requirement_mode AS ENUM (
      'mandatory',
      'optional',
      'not_required'
    );
  END IF;
END $$;


-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- -----------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. TABLES DEFINITIONS
-- -----------------------------------------

-- A. factories table
CREATE TABLE IF NOT EXISTS public.factories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_factories ON public.factories;
CREATE TRIGGER set_timestamp_factories
  BEFORE UPDATE ON public.factories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- A2. configs table
CREATE TABLE IF NOT EXISTS public.configs (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL UNIQUE,
  aadhar_number_mode field_requirement_mode NOT NULL DEFAULT 'optional',
  govt_id_mode field_requirement_mode NOT NULL DEFAULT 'optional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_config_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS set_timestamp_configs ON public.configs;
CREATE TRIGGER set_timestamp_configs
  BEFORE UPDATE ON public.configs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- B. centers table
CREATE TABLE IF NOT EXISTS public.centers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  factory_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_center_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS set_timestamp_centers ON public.centers;
CREATE TRIGGER set_timestamp_centers
  BEFORE UPDATE ON public.centers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- C. commodities table
CREATE TABLE IF NOT EXISTS public.commodities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_commodities ON public.commodities;
CREATE TRIGGER set_timestamp_commodities
  BEFORE UPDATE ON public.commodities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- D. rates table
CREATE TABLE IF NOT EXISTS public.rates (
  id SERIAL PRIMARY KEY,
  commodity_id INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  unit unit_enum NOT NULL,
  factory_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_rate_commodity
    FOREIGN KEY (commodity_id)
    REFERENCES public.commodities(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_rate_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS set_timestamp_rates ON public.rates;
CREATE TRIGGER set_timestamp_rates
  BEFORE UPDATE ON public.rates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- A0. users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role_enum NOT NULL DEFAULT 'base',
  factory_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- E. customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id SERIAL PRIMARY KEY,
  govt_id INTEGER,
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NOT NULL,
  user_id UUID UNIQUE,
  factory_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_customer_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_customer_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT
);

DROP INDEX IF EXISTS public.customers_govt_id_factory_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS customers_govt_id_factory_id_idx 
  ON public.customers (govt_id, factory_id) 
  WHERE govt_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_timestamp_customers ON public.customers;
CREATE TRIGGER set_timestamp_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- F. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  aadhar_number VARCHAR(12),
  name VARCHAR(255) NOT NULL,
  role role_enum NOT NULL DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_profile_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT check_aadhar_format
    CHECK (aadhar_number IS NULL OR aadhar_number ~ '^\d{12}$')
);

DROP INDEX IF EXISTS public.profiles_aadhar_factory_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_aadhar_factory_id_idx 
  ON public.profiles (aadhar_number, user_id) 
  WHERE aadhar_number IS NOT NULL;

DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- G. weighments table
CREATE TABLE IF NOT EXISTS public.weighments (
  id BIGSERIAL PRIMARY KEY,
  vehicle_number VARCHAR(10) NOT NULL,
  weight DECIMAL(12, 3) NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  unit unit_enum NOT NULL DEFAULT 'kg',
  type weighment_type NOT NULL DEFAULT 'in',
  rate_id INTEGER NOT NULL,
  center_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_weighment_rate
    FOREIGN KEY (rate_id)
    REFERENCES public.rates(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_weighment_center
    FOREIGN KEY (center_id)
    REFERENCES public.centers(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_weighment_profile
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_weighment_customer
    FOREIGN KEY (customer_id)
    REFERENCES public.customers(id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS set_timestamp_weighments ON public.weighments;
CREATE TRIGGER set_timestamp_weighments
  BEFORE UPDATE ON public.weighments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Enforce that only super_admin or admin can edit weight or unit
CREATE OR REPLACE FUNCTION public.check_weighments_update_columns()
RETURNS trigger AS $$
BEGIN
  IF (public.get_user_role() NOT IN ('super_admin', 'admin')) THEN
    IF (NEW.weight IS DISTINCT FROM OLD.weight OR NEW.unit IS DISTINCT FROM OLD.unit) THEN
      RAISE EXCEPTION 'Only super_admin or admin can modify weight or unit.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_weighments_update_columns ON public.weighments;
CREATE TRIGGER tr_weighments_update_columns
  BEFORE UPDATE ON public.weighments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_weighments_update_columns();


-- H. assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_assignment_factory
    FOREIGN KEY (factory_id)
    REFERENCES public.factories(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_assignment_profile
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
    
  CONSTRAINT uq_factory_profile_assignment
    UNIQUE (factory_id, profile_id)
);

DROP TRIGGER IF EXISTS set_timestamp_assignments ON public.assignments;
CREATE TRIGGER set_timestamp_assignments
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();


-- 3.1. INDEXES FOR SORTING, FILTERING & FOREIGN KEYS (Idempotent)
-- ------------------------------------------------------------------

-- A. factories table indexes
CREATE INDEX IF NOT EXISTS idx_factories_name ON public.factories (name);
CREATE INDEX IF NOT EXISTS idx_factories_created_at ON public.factories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_factories_updated_at ON public.factories (updated_at DESC);

-- B. centers table indexes
CREATE INDEX IF NOT EXISTS idx_centers_name ON public.centers (name);
CREATE INDEX IF NOT EXISTS idx_centers_factory_id ON public.centers (factory_id);
CREATE INDEX IF NOT EXISTS idx_centers_created_at ON public.centers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_centers_updated_at ON public.centers (updated_at DESC);

-- C. commodities table indexes
CREATE INDEX IF NOT EXISTS idx_commodities_created_at ON public.commodities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commodities_updated_at ON public.commodities (updated_at DESC);

-- D. rates table indexes
CREATE INDEX IF NOT EXISTS idx_rates_commodity_id ON public.rates (commodity_id);
CREATE INDEX IF NOT EXISTS idx_rates_factory_id ON public.rates (factory_id);
CREATE INDEX IF NOT EXISTS idx_rates_unit_price ON public.rates (unit_price);
CREATE INDEX IF NOT EXISTS idx_rates_unit ON public.rates (unit);
CREATE INDEX IF NOT EXISTS idx_rates_created_at ON public.rates (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rates_updated_at ON public.rates (updated_at DESC);

-- E. customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_father_name ON public.customers (father_name);
CREATE INDEX IF NOT EXISTS idx_customers_factory_id ON public.customers (factory_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers (updated_at DESC);

-- F. profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles (name);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at DESC);

-- G. weighments table indexes
CREATE INDEX IF NOT EXISTS idx_weighments_vehicle_number ON public.weighments (vehicle_number);
CREATE INDEX IF NOT EXISTS idx_weighments_weight ON public.weighments (weight);
CREATE INDEX IF NOT EXISTS idx_weighments_type ON public.weighments (type);
CREATE INDEX IF NOT EXISTS idx_weighments_unit ON public.weighments (unit);
CREATE INDEX IF NOT EXISTS idx_weighments_is_active ON public.weighments (is_active);
CREATE INDEX IF NOT EXISTS idx_weighments_rate_id ON public.weighments (rate_id);
CREATE INDEX IF NOT EXISTS idx_weighments_center_id ON public.weighments (center_id);
CREATE INDEX IF NOT EXISTS idx_weighments_profile_id ON public.weighments (profile_id);
CREATE INDEX IF NOT EXISTS idx_weighments_customer_id ON public.weighments (customer_id);
CREATE INDEX IF NOT EXISTS idx_weighments_created_at ON public.weighments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weighments_updated_at ON public.weighments (updated_at DESC);

-- H. assignments table indexes
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON public.assignments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_updated_at ON public.assignments (updated_at DESC);


-- 4. ROW LEVEL SECURITY (RLS) & POLICIES (Idempotent)
-- ----------------------------------------------------
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(user_role, 'base');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. factories policies
DROP POLICY IF EXISTS "factories_select" ON public.factories;
CREATE POLICY "factories_select" ON public.factories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "factories_insert" ON public.factories;
CREATE POLICY "factories_insert" ON public.factories FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "factories_update" ON public.factories;
CREATE POLICY "factories_update" ON public.factories FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "factories_delete" ON public.factories;
CREATE POLICY "factories_delete" ON public.factories FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- C. centers policies
DROP POLICY IF EXISTS "centers_select" ON public.centers;
CREATE POLICY "centers_select" ON public.centers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "centers_insert" ON public.centers;
CREATE POLICY "centers_insert" ON public.centers FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "centers_update" ON public.centers;
CREATE POLICY "centers_update" ON public.centers FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "centers_delete" ON public.centers;
CREATE POLICY "centers_delete" ON public.centers FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- D. commodities policies
DROP POLICY IF EXISTS "commodities_select" ON public.commodities;
CREATE POLICY "commodities_select" ON public.commodities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "commodities_insert" ON public.commodities;
CREATE POLICY "commodities_insert" ON public.commodities FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "commodities_update" ON public.commodities;
CREATE POLICY "commodities_update" ON public.commodities FOR UPDATE TO authenticated USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "commodities_delete" ON public.commodities;
CREATE POLICY "commodities_delete" ON public.commodities FOR DELETE TO authenticated USING (public.get_user_role() = 'super_admin');

-- H. rates policies
DROP POLICY IF EXISTS "rates_select" ON public.rates;
CREATE POLICY "rates_select" ON public.rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rates_insert" ON public.rates;
CREATE POLICY "rates_insert" ON public.rates FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin', 'manager'));

DROP POLICY IF EXISTS "rates_update" ON public.rates;
CREATE POLICY "rates_update" ON public.rates FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin', 'manager'));

DROP POLICY IF EXISTS "rates_delete" ON public.rates;
CREATE POLICY "rates_delete" ON public.rates FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- E. customers policies
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin', 'manager', 'operator'));

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin', 'manager', 'operator'));

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- F. profiles policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin', 'manager'));

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin', 'manager'));

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- G. weighments policies
DROP POLICY IF EXISTS "weighments_select" ON public.weighments;
CREATE POLICY "weighments_select" ON public.weighments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weighments_insert" ON public.weighments;
CREATE POLICY "weighments_insert" ON public.weighments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin', 'manager', 'operator', 'hardware'));

DROP POLICY IF EXISTS "weighments_update" ON public.weighments;
CREATE POLICY "weighments_update" ON public.weighments FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin', 'manager', 'operator'));

DROP POLICY IF EXISTS "weighments_delete" ON public.weighments;
CREATE POLICY "weighments_delete" ON public.weighments FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- I. assignments policies
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "assignments_update" ON public.assignments;
CREATE POLICY "assignments_update" ON public.assignments FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "assignments_delete" ON public.assignments;
CREATE POLICY "assignments_delete" ON public.assignments FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

-- J. configs policies
DROP POLICY IF EXISTS "configs_select" ON public.configs;
CREATE POLICY "configs_select" ON public.configs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "configs_insert" ON public.configs;
CREATE POLICY "configs_insert" ON public.configs FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "configs_update" ON public.configs;
CREATE POLICY "configs_update" ON public.configs FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "configs_delete" ON public.configs;
CREATE POLICY "configs_delete" ON public.configs FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin', 'admin'));


-- J. Supabase Storage Bucket and RLS Policies (for 'gluvok' bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gluvok', 'gluvok', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow read access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow read access for gluvok bucket"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'gluvok');

DROP POLICY IF EXISTS "Public Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow insert access for gluvok bucket"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'gluvok');

DROP POLICY IF EXISTS "Public Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow update access for gluvok bucket"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'gluvok')
WITH CHECK (bucket_id = 'gluvok');

DROP POLICY IF EXISTS "Public Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for gluvok bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access for gluvok bucket" ON storage.objects;
CREATE POLICY "Allow delete access for gluvok bucket"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'gluvok');
