import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Wrench, KeyRound, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Recovery mode state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPasswordMode, setNewPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    // Detect password recovery token in URL
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";

    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      setNewPasswordMode(true);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setNewPasswordMode(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message;
      let explanation = msg;
      if (msg.toLowerCase().includes("invalid login credentials")) {
        explanation = "Credenciales de acceso no válidas. El usuario no existe en la base de datos de Supabase Auth o la contraseña es incorrecta.";
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        explanation = "El correo aún no ha sido confirmado por enlace de activación. Puedes desactivar la confirmación obligatoria en el panel de Supabase (Auth -> Providers -> Email -> Confirm email).";
      }
      setAuthError(`${msg} (${explanation})`);
      toast.error(msg);
      return;
    }
    router.navigate({ to: "/fichar" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/fichar`,
      },
    });
    setLoading(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.navigate({ to: "/fichar" });
    } else {
      toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor introduce tu correo electrónico.");
      return;
    }
    setLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    setLoading(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
    } else {
      setResetEmailSent(true);
      toast.success(`Correo enviado a ${email} con las instrucciones para restablecer tu contraseña.`);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
    } else {
      toast.success("¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.");
      setNewPasswordMode(false);
      setIsRecoveryMode(false);
      setPassword("");
      router.navigate({ to: "/fichar" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Taller<span className="text-accent">Horas</span>
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {newPasswordMode
                ? "Nueva contraseña"
                : isRecoveryMode
                ? "Recuperar contraseña"
                : "Acceso al control horario"}
            </CardTitle>
            <CardDescription>
              {newPasswordMode
                ? "Introduce tu nueva contraseña para acceder al sistema."
                : isRecoveryMode
                ? "Te enviaremos un enlace a tu correo para restablecer tu acceso."
                : "Ficha tu jornada y consulta tus horas en un clic."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 rounded-md bg-destructive/15 p-3.5 text-xs text-destructive border border-destructive/30 space-y-1">
                <p className="font-semibold text-sm">❌ Error de autenticación:</p>
                <p className="leading-relaxed">{authError}</p>
              </div>
            )}

            {newPasswordMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Guardando…" : "Establecer nueva contraseña"}
                </Button>
              </form>
            ) : isRecoveryMode ? (
              <div className="space-y-4 pt-2">
                {resetEmailSent ? (
                  <div className="space-y-4 text-center">
                    <div className="rounded-md bg-emerald-500/15 p-4 text-emerald-700 text-sm border border-emerald-500/30">
                      ✅ <strong>¡Correo enviado!</strong><br />
                      Revisa tu bandeja de entrada en <strong>{email}</strong> y haz clic en el enlace para cambiar tu contraseña.
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setResetEmailSent(false);
                      }}
                    >
                      <ArrowLeft className="mr-2 size-4" /> Volver al inicio de sesión
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recovery-email">Correo electrónico</Label>
                      <Input
                        id="recovery-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu-correo@taller.es"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      <KeyRound className="mr-2 size-4" />
                      {loading ? "Enviando…" : "Enviar enlace de recuperación"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => setIsRecoveryMode(false)}
                    >
                      <ArrowLeft className="mr-1.5 size-3.5" /> Volver al acceso
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" onClick={() => setAuthError(null)}>Entrar</TabsTrigger>
                  <TabsTrigger value="signup" onClick={() => setAuthError(null)}>Crear cuenta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={signIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder="nombre@taller.es"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <button
                          type="button"
                          onClick={() => setIsRecoveryMode(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando…" : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre y apellidos</Label>
                      <Input
                        id="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email2">Correo</Label>
                      <Input
                        id="email2"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password2">Contraseña</Label>
                      <Input
                        id="password2"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creando…" : "Crear cuenta"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      La primera cuenta del taller se registra como gerente.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
