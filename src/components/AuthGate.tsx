import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccount, getMe } from "@/lib/workforce.functions";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const bootstrap = useServerFn(bootstrapAccount);
  const me = useServerFn(getMe);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.navigate({ to: "/auth" });
        return;
      }
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.navigate({ to: "/auth" });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    enabled: checked,
    queryFn: async () => {
      await bootstrap({ data: undefined as never });
      return me();
    },
  });

  if (!checked || isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <AppShell
      isStaff={data.isStaff}
      userName={data.employee?.full_name ?? "Empleado"}
      roleLabel={data.roles[0] ?? "empleado"}
    >
      {children}
    </AppShell>
  );
}
