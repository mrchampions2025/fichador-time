DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('gerente','encargado','administracion','empleado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('gerente','encargado','administracion')
  );
$$;

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  dni TEXT,
  email TEXT,
  phone TEXT,
  position TEXT NOT NULL DEFAULT 'Mecánico',
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 12.00,
  overtime_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  weekly_hours NUMERIC(5,2) NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  hired_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  source TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_entries_employee_idx ON public.time_entries (employee_id, clock_in DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.absence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'vacaciones',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_requests TO authenticated;
GRANT ALL ON public.absence_requests TO service_role;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  normal_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'borrador',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payrolls TO authenticated;
GRANT ALL ON public.payrolls TO service_role;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "insert roles" ON public.user_roles;
CREATE POLICY "insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "update roles" ON public.user_roles;
CREATE POLICY "update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "delete roles" ON public.user_roles;
CREATE POLICY "delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "employees select" ON public.employees;
CREATE POLICY "employees select" ON public.employees FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "employees insert" ON public.employees;
CREATE POLICY "employees insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "employees update" ON public.employees;
CREATE POLICY "employees update" ON public.employees FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "employees delete" ON public.employees;
CREATE POLICY "employees delete" ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'gerente'));

DROP POLICY IF EXISTS "entries select" ON public.time_entries;
CREATE POLICY "entries select" ON public.time_entries FOR SELECT TO authenticated USING (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "entries insert" ON public.time_entries;
CREATE POLICY "entries insert" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "entries update" ON public.time_entries;
CREATE POLICY "entries update" ON public.time_entries FOR UPDATE TO authenticated USING (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "entries delete" ON public.time_entries;
CREATE POLICY "entries delete" ON public.time_entries FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "absences select" ON public.absence_requests;
CREATE POLICY "absences select" ON public.absence_requests FOR SELECT TO authenticated USING (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "absences insert" ON public.absence_requests;
CREATE POLICY "absences insert" ON public.absence_requests FOR INSERT TO authenticated WITH CHECK (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "absences update" ON public.absence_requests;
CREATE POLICY "absences update" ON public.absence_requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "absences delete" ON public.absence_requests;
CREATE POLICY "absences delete" ON public.absence_requests FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "payrolls select" ON public.payrolls;
CREATE POLICY "payrolls select" ON public.payrolls FOR SELECT TO authenticated USING (employee_id = public.current_employee_id() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "payrolls write" ON public.payrolls;
CREATE POLICY "payrolls write" ON public.payrolls FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "payrolls update" ON public.payrolls;
CREATE POLICY "payrolls update" ON public.payrolls FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "payrolls delete" ON public.payrolls;
CREATE POLICY "payrolls delete" ON public.payrolls FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));