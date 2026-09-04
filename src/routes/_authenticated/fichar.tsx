import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogIn, LogOut, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entryHours, formatHours, monthRange, splitOvertime, sumHours } from "@/lib/hours";
import { clockIn, clockOut, getMe, listEntries } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated/fichar")({
  head: () => ({
    meta: [
      { title: "Fichar jornada | TallerHoras" },
      {
        name: "description",
        content: "Registra tu entrada y salida y consulta las horas trabajadas del mes.",
      },
      { property: "og:title", content: "Fichar jornada | TallerHoras" },
      {
        property: "og:description",
        content: "Registra tu entrada y salida y consulta tus horas del mes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: () => (
    <AuthGate>
      <FicharPage />
    </AuthGate>
  ),
});

function FicharPage() {
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const entriesFn = useServerFn(listEntries);
  const inFn = useServerFn(clockIn);
  const outFn = useServerFn(clockOut);

  const [now, setNow] = useState(() => new Date());
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [useGps, setUseGps] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const today = new Date();
  const { from, to } = monthRange(today.getFullYear(), today.getMonth() + 1);

  const entries = useQuery({
    queryKey: ["my-entries", from],
    enabled: !!meQuery.data?.employee,
    queryFn: () =>
      entriesFn({ data: { from, to, employeeId: meQuery.data?.employee?.id ?? null } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["my-entries", from] });
  };

  const inMut = useMutation({
    mutationFn: async () => {
      let coords: { latitude?: number; longitude?: number } = {};
      if (useGps && typeof navigator !== "undefined" && navigator.geolocation) {
        coords = await new Promise((resolve) =>
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
            () => resolve({}),
            { timeout: 5000 },
          ),
        );
      }
      return inFn({ data: coords });
    },
    onSuccess: () => {
      toast.success("Entrada registrada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outMut = useMutation({
    mutationFn: () => outFn({ data: { breakMinutes } }),
    onSuccess: () => {
      toast.success("Salida registrada");
      setBreakMinutes(0);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = meQuery.data?.openEntry ?? null;
  const employee = meQuery.data?.employee ?? null;
  const rows = entries.data ?? [];
  const monthHours = sumHours(rows as never, now);
  const { overtime } = splitOvertime(monthHours, Number(employee?.weekly_hours ?? 40));
  const todayHours = sumHours(
    rows.filter((r: any) => new Date(r.clock_in).toDateString() === now.toDateString()) as never,
    now,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Fichaje de jornada</h1>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <p className="font-mono text-5xl font-bold tabular-nums text-foreground md:text-7xl">
            {now.toLocaleTimeString("es-ES")}
          </p>
          {open ? (
            <p className="rounded-full bg-accent/15 px-4 py-1 text-sm font-semibold text-accent">
              Trabajando desde las{" "}
              {new Date(open.clock_in).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {formatHours(entryHours(open as never, now))}
            </p>
          ) : (
            <p className="rounded-full bg-secondary px-4 py-1 text-sm font-medium text-muted-foreground">
              Sin fichaje abierto
            </p>
          )}

          {open ? (
            <div className="w-full max-w-sm space-y-3">
              <div className="space-y-2">
                <Label htmlFor="break">Pausa (minutos)</Label>
                <Input
                  id="break"
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                />
              </div>
              <Button
                size="lg"
                variant="destructive"
                className="h-14 w-full text-base"
                disabled={outMut.isPending}
                onClick={() => outMut.mutate()}
              >
                <LogOut className="mr-2 size-5" /> Fichar salida
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-3">
              <Button
                size="lg"
                className="h-14 w-full text-base"
                disabled={inMut.isPending}
                onClick={() => inMut.mutate()}
              >
                <LogIn className="mr-2 size-5" /> Fichar entrada
              </Button>
              <button
                type="button"
                onClick={() => setUseGps((v) => !v)}
                className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <MapPin className="size-3.5" />
                {useGps ? "Guardar ubicación al fichar" : "Sin guardar ubicación"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Hoy" value={formatHours(todayHours)} />
        <StatCard title="Este mes" value={formatHours(monthHours)} />
        <StatCard title="Horas extras del mes" value={formatHours(overtime)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis fichajes del mes</CardTitle>
          <CardDescription>Historial completo con horas calculadas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Todavía no hay fichajes este mes.</p>
            )}
            {rows.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(r.clock_in).toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.clock_in).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {r.clock_out
                      ? new Date(r.clock_out).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "en curso"}
                    {r.break_minutes ? ` · pausa ${r.break_minutes} min` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatHours(entryHours(r, now))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
