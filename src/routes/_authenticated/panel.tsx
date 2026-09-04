import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, CalendarClock, Euro, Users } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEuro, formatHours, MONTHS_ES } from "@/lib/hours";
import { getDashboard } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated/panel")({
  component: () => (
    <AuthGate>
      <PanelPage />
    </AuthGate>
  ),
});

function PanelPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data } = useQuery({
    queryKey: ["dashboard", year, month],
    queryFn: () => getDashboard({ year, month }),
  });


  const years = [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Panel de control</h1>
          <p className="text-sm text-muted-foreground">
            Productividad y coste laboral de {MONTHS_ES[month - 1]} {year}.
          </p>
        </div>
        <div className="flex gap-2">
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
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Users}
          label="Plantilla activa"
          value={String(data?.employees ?? 0)}
          hint={`${data?.working ?? 0} fichando ahora`}
        />
        <Kpi
          icon={CalendarClock}
          label="Horas del mes"
          value={formatHours(data?.totalHours ?? 0)}
        />
        <Kpi
          icon={AlarmClock}
          label="Horas extras"
          value={formatHours(data?.overtimeHours ?? 0)}
          accent
        />
        <Kpi icon={Euro} label="Coste laboral" value={formatEuro(data?.cost ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horas y coste por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(data?.perEmployee ?? []).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Sin datos para este periodo.</p>
            )}
            {(data?.perEmployee ?? []).map((e) => {
              const max = Math.max(...(data?.perEmployee ?? []).map((x) => x.hours), 1);
              return (
                <div key={e.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatHours(e.hours)} · {formatEuro(e.cost)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(e.hours / max) * 100}%` }}
                    />
                  </div>
                  {e.overtime > 0 && (
                    <p className="mt-1 text-xs font-medium text-accent">
                      {formatHours(e.overtime)} de horas extras
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(data?.pendingAbsences ?? 0) > 0 && (
        <p className="text-sm text-muted-foreground">
          Tienes {data?.pendingAbsences} solicitud(es) de ausencia pendientes de revisar.
        </p>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-5">
        <span
          className={`flex size-10 items-center justify-center rounded-lg ${accent ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
