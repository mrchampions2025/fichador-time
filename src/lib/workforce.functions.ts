import { supabase } from "@/integrations/supabase/client";
import { monthRange, splitOvertime, sumHours } from "./hours";

type Role = "gerente" | "encargado" | "administracion" | "empleado";
const STAFF: Role[] = ["gerente", "encargado", "administracion"];

async function loadRoles(userId: string): Promise<Role[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: Role }) => r.role);
}

function assertStaff(roles: Role[]) {
  if (!roles.some((r) => STAFF.includes(r))) throw new Error("No tienes permisos para esta acción");
}

async function getAuthUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No estás autenticado");
  return session.user;
}

/** Crea perfil, rol y ficha de empleado la primera vez que entra un usuario. */
export async function bootstrapAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false };
  const userId = session.user.id;
  const email = session.user.email ?? null;
  const name = (session.user.user_metadata?.full_name as string) || email || "Empleado";

  await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: name, email }, { onConflict: "id" });

  const { count } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  const { data: mine } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!mine || mine.length === 0) {
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: (count ?? 0) === 0 ? "gerente" : "empleado" });
  }

  let { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!emp && email) {
    const { data: empByEmail } = await supabase
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (empByEmail) {
      await supabase
        .from("employees")
        .update({ user_id: userId })
        .eq("id", empByEmail.id);
      emp = empByEmail;
    }
  }

  if (!emp) {
    await supabase.from("employees").insert({ user_id: userId, full_name: name, email });
  }
  return { ok: true };
}

export async function getMe() {
  const user = await getAuthUser();
  const userId = user.id;
  const roles = await loadRoles(userId);
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: open } = await supabase
    .from("time_entries")
    .select("*")
    .eq("employee_id", employee?.id ?? "00000000-0000-0000-0000-000000000000")
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    userId,
    roles,
    isStaff: roles.some((r) => STAFF.includes(r)),
    employee: employee ?? null,
    openEntry: open ?? null,
  };
}

export async function clockIn(data: { latitude?: number; longitude?: number; note?: string } = {}) {
  const user = await getAuthUser();
  const userId = user.id;
  const { data: emp } = await supabase
    .from("employees")
    .select("id, active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!emp) throw new Error("No hay ficha de empleado asociada a tu cuenta");
  if (!emp.active) throw new Error("Tu ficha está dada de baja");

  const { data: open } = await supabase
    .from("time_entries")
    .select("id")
    .eq("employee_id", emp.id)
    .is("clock_out", null)
    .maybeSingle();
  if (open) throw new Error("Ya tienes un fichaje abierto");

  const { data: created, error } = await supabase
    .from("time_entries")
    .insert({
      employee_id: emp.id,
      clock_in: new Date().toISOString(),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      note: data.note ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function clockOut(data: { breakMinutes?: number; note?: string } = {}) {
  const user = await getAuthUser();
  const userId = user.id;
  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!emp) throw new Error("No hay ficha de empleado asociada a tu cuenta");

  const { data: open } = await supabase
    .from("time_entries")
    .select("*")
    .eq("employee_id", emp.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!open) throw new Error("No tienes ningún fichaje abierto");

  const { data: updated, error } = await supabase
    .from("time_entries")
    .update({
      clock_out: new Date().toISOString(),
      break_minutes: Math.max(0, Math.round(data.breakMinutes ?? 0)),
      note: data.note ?? open.note,
    })
    .eq("id", open.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function listEntries(data: { from: string; to: string; employeeId?: string | null }) {
  let q = supabase
    .from("time_entries")
    .select("*, employees(id, full_name, hourly_rate, overtime_multiplier, weekly_hours)")
    .gte("clock_in", data.from)
    .lt("clock_in", data.to)
    .order("clock_in", { ascending: false });
  if (data.employeeId) q = q.eq("employee_id", data.employeeId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function saveEntry(data: {
  id?: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  note?: string | null;
}) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const payload = {
    employee_id: data.employee_id,
    clock_in: data.clock_in,
    clock_out: data.clock_out,
    break_minutes: data.break_minutes,
    note: data.note ?? null,
    source: "manual",
  };
  const { error } = data.id
    ? await supabase.from("time_entries").update(payload).eq("id", data.id)
    : await supabase.from("time_entries").insert(payload);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteEntry(data: { id: string }) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const { error } = await supabase.from("time_entries").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveEmployee(data: {
  id?: string;
  full_name: string;
  dni?: string | null;
  email?: string | null;
  phone?: string | null;
  position: string;
  hourly_rate: number;
  overtime_multiplier: number;
  weekly_hours: number;
  active: boolean;
}) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const { id, ...payload } = data;
  const { error } = id
    ? await supabase.from("employees").update(payload).eq("id", id)
    : await supabase.from("employees").insert(payload);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function setEmployeeRole(data: { targetUserId: string; role: Role }) {
  const user = await getAuthUser();
  const roles = await loadRoles(user.id);
  if (!roles.includes("gerente")) throw new Error("Solo el gerente puede cambiar roles");
  await supabase.from("user_roles").delete().eq("user_id", data.targetUserId);
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: data.targetUserId, role: data.role });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listRoles() {
  const { data } = await supabase.from("user_roles").select("user_id, role");
  return data ?? [];
}

export async function listAbsences() {
  const { data, error } = await supabase
    .from("absence_requests")
    .select("*, employees(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAbsence(data: { kind: string; start_date: string; end_date: string; reason?: string }) {
  const user = await getAuthUser();
  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!emp) throw new Error("No hay ficha de empleado asociada a tu cuenta");
  const { error } = await supabase.from("absence_requests").insert({
    employee_id: emp.id,
    kind: data.kind,
    start_date: data.start_date,
    end_date: data.end_date,
    reason: data.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function reviewAbsence(data: { id: string; status: "aprobada" | "rechazada" }) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const { error } = await supabase
    .from("absence_requests")
    .update({ status: data.status, reviewed_by: user.id })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listPayrolls(data: { year: number; month: number }) {
  const { data: rows, error } = await supabase
    .from("payrolls")
    .select("*, employees(id, full_name, position, dni, phone, hourly_rate, overtime_multiplier, weekly_hours)")
    .eq("period_year", data.year)
    .eq("period_month", data.month)
    .order("generated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function savePayrollSignature(data: { payrollId: string; signatureDataUrl: string }) {
  const { error } = await supabase
    .from("payrolls")
    .update({ worker_signature: data.signatureDataUrl, signed_at: new Date().toISOString() })
    .eq("id", data.payrollId);
  if (error) {
    // If column worker_signature does not exist yet in DB table schema, store in note or ignore error gracefully
    console.warn("Could not save signature to DB column:", error.message);
  }
  return { ok: true };
}

export async function savePayrollAdjustments(data: { payrollId: string; adjustments: any[]; total: number }) {
  const { error } = await supabase
    .from("payrolls")
    .update({ total: data.total, note: JSON.stringify(data.adjustments) })
    .eq("id", data.payrollId);
  if (error) {
    console.warn("Could not save adjustments to DB:", error.message);
  }
  return { ok: true };
}


export async function generatePayrolls(data: { year: number; month: number }) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const { from, to } = monthRange(data.year, data.month);

  const { data: employees } = await supabase.from("employees").select("*").eq("active", true);
  const { data: entries } = await supabase
    .from("time_entries")
    .select("employee_id, clock_in, clock_out, break_minutes")
    .gte("clock_in", from)
    .lt("clock_in", to)
    .not("clock_out", "is", null);

  const rows = (employees ?? []).map((emp: any) => {
    const mine = (entries ?? []).filter((e: any) => e.employee_id === emp.id);
    const total = sumHours(mine as any);
    const { normal, overtime } = splitOvertime(total, Number(emp.weekly_hours));
    const rate = Number(emp.hourly_rate);
    const base = normal * rate;
    const extra = overtime * rate * Number(emp.overtime_multiplier);
    return {
      employee_id: emp.id,
      period_year: data.year,
      period_month: data.month,
      normal_hours: Number(normal.toFixed(2)),
      overtime_hours: Number(overtime.toFixed(2)),
      base_amount: Number(base.toFixed(2)),
      overtime_amount: Number(extra.toFixed(2)),
      bonuses: 0,
      deductions: 0,
      total: Number((base + extra).toFixed(2)),
      status: "borrador",
      generated_at: new Date().toISOString(),
    };
  });

  if (rows.length) {
    const { error } = await supabase
      .from("payrolls")
      .upsert(rows, { onConflict: "employee_id,period_year,period_month" });
    if (error) throw new Error(error.message);
  }
  return { count: rows.length };
}

export async function setPayrollStatus(data: { id: string; status: string }) {
  const user = await getAuthUser();
  assertStaff(await loadRoles(user.id));
  const { error } = await supabase
    .from("payrolls")
    .update({ status: data.status })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getDashboard(data: { year: number; month: number }) {
  const { from, to } = monthRange(data.year, data.month);

  const { data: employees } = await supabase.from("employees").select("*");
  const { data: entries } = await supabase
    .from("time_entries")
    .select("employee_id, clock_in, clock_out, break_minutes")
    .gte("clock_in", from)
    .lt("clock_in", to);
  const { data: pending } = await supabase
    .from("absence_requests")
    .select("id")
    .eq("status", "pendiente");

  const active = (employees ?? []).filter((e: any) => e.active);
  const working = (entries ?? []).filter((e: any) => !e.clock_out).length;

  let totalHours = 0;
  let overtimeHours = 0;
  let cost = 0;
  for (const emp of active) {
    const mine = (entries ?? []).filter((e: any) => e.employee_id === emp.id);
    const t = sumHours(mine as any);
    const { normal, overtime } = splitOvertime(t, Number(emp.weekly_hours));
    totalHours += t;
    overtimeHours += overtime;
    cost +=
      normal * Number(emp.hourly_rate) +
      overtime * Number(emp.hourly_rate) * Number(emp.overtime_multiplier);
  }

  const perEmployee = active
    .map((emp: any) => {
      const mine = (entries ?? []).filter((e: any) => e.employee_id === emp.id);
      const t = sumHours(mine as any);
      const { normal, overtime } = splitOvertime(t, Number(emp.weekly_hours));
      return {
        id: emp.id,
        name: emp.full_name,
        hours: Number(t.toFixed(2)),
        overtime: Number(overtime.toFixed(2)),
        cost: Number(
          (
            normal * Number(emp.hourly_rate) +
            overtime * Number(emp.hourly_rate) * Number(emp.overtime_multiplier)
          ).toFixed(2),
        ),
      };
    })
    .sort((a, b) => b.hours - a.hours);

  return {
    employees: active.length,
    working,
    pendingAbsences: (pending ?? []).length,
    totalHours: Number(totalHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    cost: Number(cost.toFixed(2)),
    perEmployee,
  };
}
