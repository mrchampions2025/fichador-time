export type EntryLike = {
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
};

/** Horas trabajadas de un fichaje cerrado (descontando pausas). */
export function entryHours(entry: EntryLike, now: Date = new Date()): number {
  const start = new Date(entry.clock_in).getTime();
  const end = entry.clock_out ? new Date(entry.clock_out).getTime() : now.getTime();
  const ms = Math.max(0, end - start);
  return Math.max(0, ms / 3_600_000 - (entry.break_minutes || 0) / 60);
}

export function sumHours(entries: EntryLike[], now: Date = new Date()): number {
  return entries.reduce((acc, e) => acc + entryHours(e, now), 0);
}

/** Horas ordinarias de referencia de un mes, a partir de la jornada semanal. */
export function monthlyBaseHours(weeklyHours: number): number {
  return (weeklyHours * 52) / 12;
}

export function splitOvertime(totalHours: number, weeklyHours: number) {
  const base = monthlyBaseHours(weeklyHours);
  const normal = Math.min(totalHours, base);
  return { normal, overtime: Math.max(0, totalHours - base) };
}

export function formatHours(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(value) ? value : 0,
  );
}

export const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, month, 1)).toISOString();
  return { from, to };
}
