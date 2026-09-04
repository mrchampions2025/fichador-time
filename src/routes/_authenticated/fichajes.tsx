import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { entryHours, formatHours, MONTHS_ES, monthRange } from "@/lib/hours";
import { deleteEntry, listEmployees, listEntries, saveEntry } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated/fichajes")({
  head: () => ({
    meta: [
      { title: "Registro de fichajes | TallerHoras" },
      {
        name: "description",
        content:
          "Consulta, corrige y exporta todos los fichajes del taller por empleado y periodo.",
      },
      { property: "og:title", content: "Registro de fichajes | TallerHoras" },
      {
        property: "og:description",
        content: "Consulta, corrige y exporta los fichajes del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: () => (
    <AuthGate>
      <FichajesPage />
    </AuthGate>
  ),
});

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FichajesPage() {
  const qc = useQueryClient();
  const entriesFn = useServerFn(listEntries);
  const employeesFn = useServerFn(listEmployees);
  const saveFn = useServerFn(saveEntry);
  const delFn = useServerFn(deleteEntry);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    employee_id: "",
    clock_in: "",
    clock_out: "",
    break_minutes: 0,
    note: "",
  });

  const { from, to } = monthRange(year, month);
  const employees = useQuery({ queryKey: ["employees"], queryFn: () => employeesFn() });
  const entries = useQuery({
    queryKey: ["entries", from, employeeId],
    queryFn: () =>
      entriesFn({ data: { from, to, employeeId: employeeId === "all" ? null : employeeId } }),
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          employee_id: form.employee_id,
          clock_in: new Date(form.clock_in).toISOString(),
          clock_out: form.clock_out ? new Date(form.clock_out).toISOString() : null,
          break_minutes: Number(form.break_minutes),
          note: form.note || null,
        },
      }),
    onSuccess: () => {
      toast.success("Fichaje guardado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Fichaje eliminado");
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = entries.data ?? [];

  function exportCsv() {
    const header = "Empleado;Entrada;Salida;Pausa (min);Horas\n";
    const body = rows
      .map((r: any) =>
        [
          r.employees?.full_name ?? "",
          new Date(r.clock_in).toLocaleString("es-ES"),
          r.clock_out ? new Date(r.clock_out).toLocaleString("es-ES") : "",
          r.break_minutes,
          entryHours(r).toFixed(2).replace(".", ","),
        ].join(";"),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichajes-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fichajes</h1>
          <p className="text-sm text-muted-foreground">
            Registro completo del taller con corrección manual de incidencias.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los empleados</SelectItem>
              {(employees.data ?? []).map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_ES.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[today.getFullYear(), today.getFullYear() - 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 size-4" /> CSV
          </Button>
          <Button
            onClick={() => {
              setForm({
                id: undefined,
                employee_id: (employees.data ?? [])[0]?.id ?? "",
                clock_in: toLocalInput(new Date().toISOString()),
                clock_out: "",
                break_minutes: 0,
                note: "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Añadir
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Pausa</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay fichajes en este periodo.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name}</TableCell>
                  <TableCell>{new Date(r.clock_in).toLocaleString("es-ES")}</TableCell>
                  <TableCell>
                    {r.clock_out ? (
                      new Date(r.clock_out).toLocaleString("es-ES")
                    ) : (
                      <span className="text-accent">En curso</span>
                    )}
                  </TableCell>
                  <TableCell>{r.break_minutes} min</TableCell>
                  <TableCell className="tabular-nums">{formatHours(entryHours(r))}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => {
                        setForm({
                          id: r.id,
                          employee_id: r.employee_id,
                          clock_in: toLocalInput(r.clock_in),
                          clock_out: toLocalInput(r.clock_out),
                          break_minutes: r.break_minutes,
                          note: r.note ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() => remove.mutate(r.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Corregir fichaje" : "Nuevo fichaje"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={form.employee_id}
                onValueChange={(v) => setForm({ ...form, employee_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {(employees.data ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="datetime-local"
                  value={form.clock_in}
                  onChange={(e) => setForm({ ...form, clock_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Salida</Label>
                <Input
                  type="datetime-local"
                  value={form.clock_out}
                  onChange={(e) => setForm({ ...form, clock_out: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pausa (minutos)</Label>
              <Input
                type="number"
                min={0}
                value={form.break_minutes}
                onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nota / justificación</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.employee_id || !form.clock_in}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
