import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatEuro } from "@/lib/hours";
import { listEmployees, listRoles, saveEmployee, setEmployeeRole } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated/empleados")({
  component: () => (
    <AuthGate>
      <EmpleadosPage />
    </AuthGate>
  ),
});

type EmployeeForm = {
  id?: string;
  full_name: string;
  dni: string;
  email: string;
  phone: string;
  position: string;
  hourly_rate: number;
  overtime_multiplier: number;
  weekly_hours: number;
  active: boolean;
  user_id?: string | null;
};

const EMPTY: EmployeeForm = {
  full_name: "",
  dni: "",
  email: "",
  phone: "",
  position: "Mecánico",
  hourly_rate: 12,
  overtime_multiplier: 1.5,
  weekly_hours: 40,
  active: true,
};

const ROLES = ["gerente", "encargado", "administracion", "empleado"] as const;

function EmpleadosPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY);

  const employees = useQuery({ queryKey: ["employees"], queryFn: () => listEmployees() });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => listRoles() });

  const save = useMutation({
    mutationFn: () =>
      saveEmployee({
        ...(form.id ? { id: form.id } : {}),
        full_name: form.full_name,
        dni: form.dni || null,
        email: form.email || null,
        phone: form.phone || null,
        position: form.position,
        hourly_rate: Number(form.hourly_rate),
        overtime_multiplier: Number(form.overtime_multiplier),
        weekly_hours: Number(form.weekly_hours),
        active: form.active,
      }),
    onSuccess: () => {
      toast.success("Empleado guardado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: (v: { targetUserId: string; role: (typeof ROLES)[number] }) => setEmployeeRole(v),
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const roleOf = (userId: string | null) =>
    (roles.data ?? []).find((r: any) => r.user_id === userId)?.role ?? "empleado";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Plantilla</h1>
          <p className="text-sm text-muted-foreground">
            Datos laborales de cada empleado del taller.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" /> Nuevo empleado
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(employees.data ?? []).map((e: any) => (
          <Card key={e.id}>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{e.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.position} · {e.email ?? "sin correo"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={e.active ? "default" : "secondary"}>
                    {e.active ? "Activo" : "Baja"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Editar"
                    onClick={() => {
                      setForm({
                        id: e.id,
                        full_name: e.full_name,
                        dni: e.dni ?? "",
                        email: e.email ?? "",
                        phone: e.phone ?? "",
                        position: e.position,
                        hourly_rate: Number(e.hourly_rate),
                        overtime_multiplier: Number(e.overtime_multiplier),
                        weekly_hours: Number(e.weekly_hours),
                        active: e.active,
                        user_id: e.user_id,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Info label="Precio/hora" value={formatEuro(Number(e.hourly_rate))} />
                <Info label="Recargo extra" value={`x${Number(e.overtime_multiplier)}`} />
                <Info label="Jornada" value={`${Number(e.weekly_hours)} h/sem`} />
              </div>
              {e.user_id && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Rol:</span>
                  <Select
                    value={roleOf(e.user_id)}
                    onValueChange={(v) =>
                      changeRole.mutate({ targetUserId: e.user_id, role: v as any })
                    }
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>
              Los datos laborales se usan para calcular horas extras y nóminas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre y apellidos" className="sm:col-span-2">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="DNI">
              <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
            </Field>
            <Field label="Puesto">
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Precio por hora (€)">
              <Input
                type="number"
                step="0.01"
                value={form.hourly_rate}
                onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
              />
            </Field>
            <Field label="Multiplicador horas extra">
              <Input
                type="number"
                step="0.05"
                value={form.overtime_multiplier}
                onChange={(e) => setForm({ ...form, overtime_multiplier: Number(e.target.value) })}
              />
            </Field>
            <Field label="Jornada semanal (h)">
              <Input
                type="number"
                step="0.5"
                value={form.weekly_hours}
                onChange={(e) => setForm({ ...form, weekly_hours: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
                id="active"
              />
              <Label htmlFor="active">Empleado activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.full_name}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
