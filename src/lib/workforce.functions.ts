import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { monthRange, splitOvertime, sumHours } from "./hours";

type Role = "gerente" | "encargado" | "administracion" | "empleado";
const STAFF: Role[] = ["gerente", "encargado", "administracion"];

async function loadRoles(supabase: any, userId: string): Promise<Role[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: Role }) => r.role);
}

function assertStaff(roles: Role[]) {
  if (!roles.some((r) => STAFF.includes(r))) throw new Error("No tienes permisos para esta acción");
}

/** Crea perfil, rol y ficha de empleado la primera vez que entra un usuario. */
export const bootstrapAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (claims["email"] as string) ?? null;
    const name = ((claims["user_metadata"] as any)?.full_name as string) || email || "Empleado";

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: name, email }, { onConflict: "id" });

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    const { data: mine } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!mine || mine.length === 0) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: (count ?? 0) === 0 ? "gerente" : "empleado" });
    }

    const { data: emp } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!emp) {
      await supabaseAdmin.from("employees").insert({ user_id: userId, full_name: name, email });
    }
    return { ok: true };
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await loadRoles(supabase, userId);
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
  });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { latitude?: number; longitude?: number; note?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { breakMinutes?: number; note?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
  });

export const listEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string; employeeId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
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
  });

export const saveEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      employee_id: string;
      clock_in: string;
      clock_out: string | null;
      break_minutes: number;
      note?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
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
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
    const { error } = await supabase.from("time_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("employees")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
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
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
    const { id, ...payload } = data;
    const { error } = id
      ? await supabase.from("employees").update(payload).eq("id", id)
      : await supabase.from("employees").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; role: Role }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await loadRoles(supabase, userId);
    if (!roles.includes("gerente")) throw new Error("Solo el gerente puede cambiar roles");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.targetUserId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("user_id, role");
    return data ?? [];
  });

export const listAbsences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("absence_requests")
      .select("*, employees(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { kind: string; start_date: string; end_date: string; reason?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
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
  });

export const reviewAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "aprobada" | "rechazada" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
    const { error } = await supabase
      .from("absence_requests")
      .update({ status: data.status, reviewed_by: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPayrolls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("payrolls")
      .select("*, employees(full_name, position)")
      .eq("period_year", data.year)
      .eq("period_month", data.month)
      .order("generated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const generatePayrolls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
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
  });

export const setPayrollStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertStaff(await loadRoles(supabase, userId));
    const { error } = await supabase
      .from("payrolls")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
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
  });
