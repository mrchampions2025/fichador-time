import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Clock, FileSpreadsheet, ShieldCheck, Smartphone, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TallerHoras | Control horario y nóminas para talleres" },
      {
        name: "description",
        content:
          "Sustituye el fichaje en papel: fichaje digital, cálculo automático de horas extras, nóminas y control de costes laborales para tu taller mecánico.",
      },
      { property: "og:title", content: "TallerHoras | Control horario y nóminas para talleres" },
      {
        property: "og:description",
        content:
          "Fichaje digital, horas extras automáticas y nóminas para talleres mecánicos, desde el móvil o el ordenador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Clock,
    title: "Fichaje en un toque",
    text: "Entrada y salida con hora exacta, pausas y ubicación opcional.",
  },
  {
    icon: BarChart3,
    title: "Horas extras automáticas",
    text: "Comparación con la jornada pactada y recargo configurable por empleado.",
  },
  {
    icon: FileSpreadsheet,
    title: "Nóminas al instante",
    text: "Genera la nómina mensual de toda la plantilla con un botón.",
  },
  {
    icon: Smartphone,
    title: "Móvil y ordenador",
    text: "Interfaz rápida y responsive para el taller y para la oficina.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    text: "Gerente, encargado, administración y empleado, cada uno con su vista.",
  },
  {
    icon: Wrench,
    title: "Pensado para talleres",
    text: "Plantilla, puestos, precios/hora y ausencias en un mismo sitio.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-5" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            Taller<span className="text-accent">Horas</span>
          </span>
        </div>
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Acceder
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-20">
        <p className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Control horario para talleres mecánicos
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
          Adiós al fichaje en papel. Horas, extras y nóminas bajo control.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Tus mecánicos fichan desde el móvil, tú ves las horas reales de cada uno y generas las
          nóminas del mes en segundos, con el cálculo de horas extras hecho.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Empezar ahora
          </Link>
          <Link
            to="/fichar"
            className="rounded-md border border-input bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Ir a fichar
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        TallerHoras — control horario, horas extras y nóminas.
      </footer>
    </div>
  );
}
