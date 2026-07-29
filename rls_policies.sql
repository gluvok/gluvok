-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Fully Idempotent Script (Safe to re-run)
-- Enables RLS on all public tables with basic permissive policies
-- ==========================================

-- 1. Enable RLS and create basic permissive policies for all public tables

-- Factories
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "factories_allow_all" ON public.factories;
CREATE POLICY "factories_allow_all" ON public.factories
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Centers
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centers_allow_all" ON public.centers;
CREATE POLICY "centers_allow_all" ON public.centers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Commodities
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commodities_allow_all" ON public.commodities;
CREATE POLICY "commodities_allow_all" ON public.commodities
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Rates
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rates_allow_all" ON public.rates;
CREATE POLICY "rates_allow_all" ON public.rates
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_allow_all" ON public.users;
CREATE POLICY "users_allow_all" ON public.users
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_allow_all" ON public.customers;
CREATE POLICY "customers_allow_all" ON public.customers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_allow_all" ON public.profiles;
CREATE POLICY "profiles_allow_all" ON public.profiles
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Weighments
ALTER TABLE public.weighments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weighments_allow_all" ON public.weighments;
CREATE POLICY "weighments_allow_all" ON public.weighments
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
