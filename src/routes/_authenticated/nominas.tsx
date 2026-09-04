import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Download, Printer, FileText, Share2, FileSignature, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEuro, formatHours, MONTHS_ES } from "@/lib/hours";
import {
  generatePayrolls,
  listPayrolls,
  setPayrollStatus,
  savePayrollSignature,
  savePayrollAdjustments,
} from "@/lib/workforce.functions";
import { PayrollDocumentModal } from "@/components/PayrollDocumentModal";
import { printPayrollDocument } from "@/lib/pdf.utils";

export const Route = createFileRoute("/_authenticated/nominas")({
  component: () => (
    <AuthGate>
      <NominasPage />
    </AuthGate>
  ),
});

const STATUS = ["borrador", "aprobada", "pagada"] as const;

function NominasPage() {
  const qc = useQueryClient();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [autoAction, setAutoAction] = useState<"view" | "download" | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);


  const payrolls = useQuery({
    queryKey: ["payrolls", year, month],
    queryFn: () => listPayrolls({ year, month }),
  });

  const generate = useMutation({
    mutationFn: () => generatePayrolls({ year, month }),
    onSuccess: (r) => {
      toast.success(`${r.count} nómina(s) calculada(s)`);
      qc.invalidateQueries({ queryKey: ["payrolls", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => setPayrollStatus(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payrolls", year, month] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveSignature = async (payrollId: string, signatureDataUrl: string) => {
    await savePayrollSignature({ payrollId, signatureDataUrl });
    qc.invalidateQueries({ queryKey: ["payrolls", year, month] });
  };

  const handleSaveAdjustments = async (payrollId: string, adjustments: any[], total: number) => {
    await savePayrollAdjustments({ payrollId, adjustments, total });
    qc.invalidateQueries({ queryKey: ["payrolls", year, month] });
  };

  const rows = payrolls.data ?? [];
  const total = rows.reduce((a: number, r: any) => a + Number(r.total), 0);

  function exportCsv() {
    const header = "Empleado;Horas normales;Horas extra;Base;Extras;Total;Estado\n";
    const body = rows
      .map((r: any) =>
        [
          r.employees?.full_name ?? "",
          Number(r.normal_hours).toFixed(2).replace(".", ","),
          Number(r.overtime_hours).toFixed(2).replace(".", ","),
          Number(r.base_amount).toFixed(2).replace(".", ","),
          Number(r.overtime_amount).toFixed(2).replace(".", ","),
          Number(r.total).toFixed(2).replace(".", ","),
          r.status,
        ].join(";"),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nominas-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nóminas</h1>
          <p className="text-sm text-muted-foreground">
            Cálculo automático a partir de los fichajes de {MONTHS_ES[month - 1]} {year}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Imprimir
          </Button>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Calculator className="mr-2 size-4" /> Calcular nóminas
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay nóminas para este mes. Pulsa «Calcular nóminas».
            </CardContent>
          </Card>
        )}
        {rows.map((r: any) => (
          <Card key={r.id} className="break-inside-avoid">
            <CardContent className="space-y-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{r.employees?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.employees?.position} · {MONTHS_ES[month - 1]} {year}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.worker_signature && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Firmada
                    </Badge>
                  )}
                  <Badge variant={r.status === "pagada" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              </div>
              <dl className="space-y-1 text-sm">
                <Line label="Horas normales" value={formatHours(Number(r.normal_hours))} />
                <Line label="Horas extras" value={formatHours(Number(r.overtime_hours))} accent />
                <Line label="Salario base" value={formatEuro(Number(r.base_amount))} />
                <Line label="Importe horas extras" value={formatEuro(Number(r.overtime_amount))} />
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <dt className="font-semibold text-foreground">Total a pagar</dt>
                  <dd className="text-lg font-bold tabular-nums text-foreground">
                    {formatEuro(Number(r.total))}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 pt-1 print:hidden">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setSelectedPayroll(r);
                    setAutoAction(null);
                    setDocumentOpen(true);
                  }}
                >
                  <FileSignature className="mr-1.5 size-4" /> Ver / Firmar Nómina
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-violet-600 border-violet-500/30 hover:bg-violet-50"
                  onClick={() => {
                    setSelectedPayroll(r);
                    setAutoAction("view");
                    setDocumentOpen(true);
                  }}
                >
                  <Eye className="mr-1.5 size-4" /> Ver PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-500/30 hover:bg-blue-50"
                  onClick={() => {
                    setSelectedPayroll(r);
                    setAutoAction("download");
                    setDocumentOpen(true);
                  }}
                >
                  <Download className="mr-1.5 size-4" /> Descargar PDF
                </Button>
                {STATUS.filter((s) => s !== r.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus.mutate({ id: r.id, status: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length > 0 && (
        <p className="text-right text-sm font-semibold text-foreground">
          Coste total del mes: {formatEuro(total)}
        </p>
      )}

      {selectedPayroll && (
        <PayrollDocumentModal
          open={documentOpen}
          onOpenChange={setDocumentOpen}
          payroll={selectedPayroll}
          autoAction={autoAction}
          onSaveSignature={handleSaveSignature}
          onSaveAdjustments={handleSaveAdjustments}
        />
      )}

    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${accent ? "font-semibold text-accent" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

