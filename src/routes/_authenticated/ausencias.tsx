import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Paperclip, Plus, X } from "lucide-react";
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
  component: () => (
    <AuthGate>
      <AusenciasPage />
    </AuthGate>
  ),
});

const KINDS = ["vacaciones", "baja médica", "permiso", "asuntos propios"] as const;

function parseReasonAndAttachment(reasonStr?: string | null) {
  if (!reasonStr) return { text: "", attachmentUrl: null };
  const match = reasonStr.match(/\[ADJUNTO:(.*?)\]/);
  if (match) {
    const attachmentUrl = match[1];
    const text = reasonStr.replace(/\[ADJUNTO:.*?\]/, "").trim();
    return { text, attachmentUrl };
  }
  return { text: reasonStr, attachmentUrl: null };
}

function AusenciasPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [form, setForm] = useState({
    kind: "vacaciones" as string,
    start_date: "",
    end_date: "",
    reason: "",
  });

  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const absences = useQuery({ queryKey: ["absences"], queryFn: () => listAbsences() });
  const isStaff = me.data?.isStaff ?? false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("El archivo adjunto no debe superar los 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAttachment(evt.target?.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const create = useMutation({
    mutationFn: () =>
      createAbsence({
        kind: form.kind,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        attachment_url: attachment ?? undefined,
      }),
    onSuccess: () => {
      toast.success("Solicitud enviada correctamente");
      setOpen(false);
      setAttachment(null);
      setAttachmentName("");
      qc.invalidateQueries({ queryKey: ["absences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: (v: { id: string; status: "aprobada" | "rechazada" }) => reviewAbsence(v),
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
            Solicita días libres, adjunta justificantes médicos y consulta el estado.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ kind: "vacaciones", start_date: "", end_date: "", reason: "" });
            setAttachment(null);
            setAttachmentName("");
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
        {rows.map((a: any) => {
          const { text: cleanReason, attachmentUrl } = parseReasonAndAttachment(a.reason);
          return (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {a.employees?.full_name} · <span className="capitalize">{a.kind}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(a.start_date).toLocaleDateString("es-ES")} –{" "}
                    {new Date(a.end_date).toLocaleDateString("es-ES")}
                    {cleanReason ? ` · ${cleanReason}` : ""}
                  </p>
                  {attachmentUrl && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            if (attachmentUrl.startsWith("data:image")) {
                              win.document.write(`<img src="${attachmentUrl}" style="max-width:100%; margin: 20px auto; display:block;" />`);
                            } else {
                              win.document.write(`<iframe src="${attachmentUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100vh;" allowfullscreen></iframe>`);
                            }
                          }
                        }}
                      >
                        <Paperclip className="size-3.5 text-primary" /> Ver justificante adjunto
                      </Button>
                    </div>
                  )}
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
          );
        })}
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
              <Label>Tipo de ausencia</Label>
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
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo / Explicación (opcional)</Label>
              <Textarea
                placeholder="Ej: Consulta médica, asuntos familiares..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Justificante / Adjunto (PDF o Imagen)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
              {attachmentName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="size-3 text-primary" /> Adjunto: {attachmentName}
                </p>
              )}
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

