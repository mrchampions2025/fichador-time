import { Link, useRouter } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Wrench,
  Settings,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Clock; staffOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/fichar", label: "Fichar", icon: Clock },
  { to: "/panel", label: "Panel", icon: LayoutDashboard, staffOnly: true },
  { to: "/fichajes", label: "Fichajes", icon: FileSpreadsheet, staffOnly: true },
  { to: "/empleados", label: "Empleados", icon: Users, staffOnly: true },
  { to: "/nominas", label: "Nóminas", icon: FileSpreadsheet, staffOnly: true },
  { to: "/ausencias", label: "Ausencias", icon: CalendarDays },
  { to: "/configuracion", label: "Configuración", icon: Settings, staffOnly: true },
];


export function AppShell({
  children,
  isStaff,
  userName,
  roleLabel,
}: {
  children: ReactNode;
  isStaff: boolean;
  userName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((i) => !i.staffOnly || isStaff);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/fichar" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="size-5" />
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              Taller<span className="text-accent">Horas</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">{userName}</p>
              <p className="text-xs capitalize leading-tight text-muted-foreground">{roleLabel}</p>
            </div>
            <Button variant="outline" size="icon" onClick={signOut} aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>

        <nav className={cn("border-t border-border px-4 pb-3 md:hidden", open ? "block" : "hidden")}>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
