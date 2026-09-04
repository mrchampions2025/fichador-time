import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createAbsence, getMe, listAbsences, reviewAbsence } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated/ausencias")({
  head: () => ({
    meta: [
      { title: "Vacaciones y ausencias | TallerHoras" },
      {
        name: "description",
        content:
          "Solicita vacaciones, bajas o permisos y gestiona las aprobaciones del equipo del taller.",
      },
      { property: "og:title", content: "Vacaciones y ausencias | TallerHoras" },
      {
        property: "og:description",
        content: "Solicitudes de vacaciones, bajas y permisos con aprobación del responsable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: () => (
    <AuthGate>
      <AusenciasPage />
    </AuthGate>
  ),
});

const KINDS = ["vacaciones", "baja médica", "permiso", "asuntos propios"] as const;

function AusenciasPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAbsences);
  const createFn = useServerFn(createAbsence);
  const reviewFn = useServerFn(reviewAbsence);
  const meFn = useServerFn(getMe);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "vacaciones" as string,
    start_date: "",
    end_date: "",
    reason: "",
  });

  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const absences = useQuery({ queryKey: ["absences"], queryFn: () => listFn() });
  const isStaff = me.data?.isStaff ?? false;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          kind: form.kind,
          start_date: form.start_date,
          end_date: form.end_date,
          ...(form.reason ? { reason: form.reason } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Solicitud enviada");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["absences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: (v: { id: string; status: "aprobada" | "rechazada" }) => reviewFn({ data: v }),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      qc.invalidateQueries({ queryKey: ["absences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = absences.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vacaciones y ausencias
          </h1>
          <p className="text-sm text-muted-foreground">
            Solicita días libres y consulta el estado de las peticiones.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ kind: "vacaciones", start_date: "", end_date: "", reason: "" });
            setOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" /> Nueva solicitud
        </Button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay solicitudes registradas.
            </CardContent>
          </Card>
        )}
        {rows.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium text-foreground">
                  {a.employees?.full_name} · <span className="capitalize">{a.kind}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(a.start_date).toLocaleDateString("es-ES")} –{" "}
                  {new Date(a.end_date).toLocaleDateString("es-ES")}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    a.status === "aprobada"
                      ? "default"
                      : a.status === "rechazada"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {a.status}
                </Badge>
                {isStaff && a.status === "pendiente" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => review.mutate({ id: a.id, status: "aprobada" })}
                    >
                      <Check className="mr-1 size-4" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review.mutate({ id: a.id, status: "rechazada" })}
                    >
                      <X className="mr-1 size-4" /> Rechazar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva solicitud</DialogTitle>
            <DialogDescription>
              El responsable recibirá la petición para aprobarla o rechazarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.start_date || !form.end_date}
            >
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
