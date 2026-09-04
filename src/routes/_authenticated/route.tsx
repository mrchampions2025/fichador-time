import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccount, getMe } from "@/lib/workforce.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const bootstrap = useServerFn(bootstrapAccount);
  const me = useServerFn(getMe);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      await bootstrap({ data: undefined as never });
      return me();
    },
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (isLoading || !data) {
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
      <Outlet />
    </AppShell>
  );
}
