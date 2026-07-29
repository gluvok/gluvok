-- rls_policies.sql
-- Note: Policy definitions and helper functions for public.users architecture

-- ============================================================================
-- 0. Schema Updates
-- Ensure factory_id exists on customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS factory_id int REFERENCES factories(id) ON DELETE RESTRICT;

-- Ensure unit column exists on weighments table
ALTER TABLE weighments ADD COLUMN IF NOT EXISTS unit unit_enum NOT NULL DEFAULT 'kg';


-- ============================================================================
-- 1. Helper functions for user isolation and roles (using public.users)
-- ============================================================================

-- Get user's role from public.users or profiles
CREATE OR REPLACE FUNCTION current_user_role(u_id uuid) RETURNS text AS $$
  SELECT role::text FROM public.users WHERE id = u_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get current user's factory_id from public.users
CREATE OR REPLACE FUNCTION current_user_factory_id(u_id uuid) RETURNS int AS $$
  SELECT factory_id FROM public.users WHERE id = u_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get current customer's ID based on user_id
CREATE OR REPLACE FUNCTION current_customer_id(u_id uuid) RETURNS int AS $$
  SELECT id FROM customers WHERE user_id = u_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get username from public.users
CREATE OR REPLACE FUNCTION get_username(u_id uuid) RETURNS text AS $$
  SELECT username::text FROM public.users WHERE id = u_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_username(uuid) TO authenticated;

-- Get list of users from public.users isolated by factory (running as SECURITY DEFINER)
-- super_admin sees all registered users with non-excluded roles.
-- Non-super-admin sees only their factory's users.
CREATE OR REPLACE FUNCTION get_users(
  current_u_id uuid DEFAULT NULL,
  exclude_current_id uuid DEFAULT NULL,
  filter_context text DEFAULT NULL
)
RETURNS TABLE (id uuid, username text, role text, factory_id int) AS $$
DECLARE
  caller_role text;
  caller_factory int;
BEGIN
  SELECT u.role::text, u.factory_id INTO caller_role, caller_factory
  FROM public.users u
  WHERE u.id = current_u_id;

  IF (caller_role = 'super_admin') THEN
    RETURN QUERY
    SELECT u.id, u.username::text, u.role::text, u.factory_id
    FROM public.users u
    WHERE u.role::text NOT IN ('super_admin', 'hardware')
    AND (
      filter_context IS NULL
      OR (
        filter_context = 'customers' AND (
          u.id = exclude_current_id
          OR NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
        )
      )
      OR (
        filter_context = 'profiles' AND (
          u.id = exclude_current_id
          OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
        )
      )
    );
  ELSE
    RETURN QUERY
    SELECT u.id, u.username::text, u.role::text, u.factory_id
    FROM public.users u
    WHERE u.role::text NOT IN ('super_admin', 'hardware')
    AND u.factory_id = caller_factory
    AND (
      filter_context IS NULL
      OR (
        filter_context = 'customers' AND (
          u.id = exclude_current_id
          OR NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
        )
      )
      OR (
        filter_context = 'profiles' AND (
          u.id = exclude_current_id
          OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
        )
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_users(uuid, uuid, text) TO authenticated;


-- ============================================================================
-- 1.5 Users RLS Policies
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_all_policy" ON users;
CREATE POLICY "users_all_policy" ON users FOR ALL USING (true);

-- ============================================================================
-- 2. Profiles RLS Policies
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_isolation_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_modify_policy" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_modify_policy" ON profiles
FOR ALL USING (true);


-- ============================================================================
-- 3. Customers RLS Policies
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_isolation_policy" ON customers;
CREATE POLICY "customers_isolation_policy" ON customers
FOR ALL USING (true);


-- ============================================================================
-- 4. Factories RLS Policies
-- ============================================================================
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factories_isolation_policy" ON factories;
CREATE POLICY "factories_isolation_policy" ON factories
FOR ALL USING (true);


-- ============================================================================
-- 5. Centers RLS Policies
-- ============================================================================
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "centers_isolation_policy" ON centers;
CREATE POLICY "centers_isolation_policy" ON centers
FOR ALL TO authenticated
USING (true);


-- ============================================================================
-- 6. Rates RLS Policies
-- ============================================================================
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rates_isolation_policy" ON rates;
CREATE POLICY "rates_isolation_policy" ON rates
FOR ALL TO authenticated
USING (true);


-- ============================================================================
-- 7. Weighments RLS Policies
-- ============================================================================
ALTER TABLE weighments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weighments_isolation_policy" ON weighments;
CREATE POLICY "weighments_isolation_policy" ON weighments
FOR ALL TO authenticated
USING (true);


-- ============================================================================
-- 8. Commodities RLS Policies
-- ============================================================================
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commodities_select_policy" ON commodities;
CREATE POLICY "commodities_select_policy" ON commodities
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "commodities_all_policy" ON commodities;
CREATE POLICY "commodities_all_policy" ON commodities
FOR ALL TO authenticated
USING (true);


-- ============================================================================
-- 9. Profiles with Username View
-- ============================================================================
DROP VIEW IF EXISTS profiles_with_email CASCADE;
DROP VIEW IF EXISTS profiles_with_username CASCADE;

CREATE OR REPLACE VIEW profiles_with_username WITH (security_invoker = on) AS
SELECT
  p.id,
  p.user_id,
  p.aadhar_number,
  p.name,
  p.created_at,
  p.updated_at,
  u.role,
  u.factory_id,
  u.username
FROM profiles p
JOIN public.users u ON p.user_id = u.id;

GRANT SELECT ON public.profiles_with_username TO authenticated;
