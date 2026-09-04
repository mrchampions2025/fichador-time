import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { getCompanySettings, saveCompanySettings, CompanySettings } from "@/lib/company.settings";
import { Building2, Save, Upload, Stamp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: () => (
    <AuthGate>
      <ConfiguracionPage />
    </AuthGate>
  ),
});

function ConfiguracionPage() {
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings());
  const [stampTab, setStampTab] = useState<"draw" | "upload">("draw");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanySettings(settings);
    toast.success("Configuración de empresa guardada con éxito");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "stampUrl" | "logoUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setSettings((prev) => {
        const updated = { ...prev, [field]: result };
        saveCompanySettings(updated);
        return updated;
      });
      toast.success(field === "stampUrl" ? "Sello de empresa guardado" : "Logo de empresa guardado");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => {
      const updated = { ...prev, logoUrl: "" };
      saveCompanySettings(updated);
      return updated;
    });
    toast.success("Logo de empresa eliminado");
  };

  const handleRemoveStamp = () => {
    setSettings((prev) => {
      const updated = { ...prev, stampUrl: "" };
      saveCompanySettings(updated);
      return updated;
    });
    toast.success("Sello de empresa eliminado");
  };


  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="size-6 text-primary" /> Configuración del Taller y Nóminas
        </h1>
        <p className="text-sm text-muted-foreground">
          Define el logo, sello, firma y datos fiscales de tu empresa para que aparezcan por defecto en todas las nóminas.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos Fiscales del Taller</CardTitle>
            <CardDescription>
              Información que encabezará los partes de trabajo y documentos de pago.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nombre / Razón Social del Taller</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                placeholder="NEUMACAR MOTORS S.L."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif">CIF / NIF</Label>
              <Input
                id="cif"
                value={settings.cif}
                onChange={(e) => setSettings({ ...settings, cif: e.target.value })}
                placeholder="B24919898"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono / Móviles</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="Móvil: 617 038 528 - 632 406 008"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección Fiscal</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Plg. Ind. Autopista C/ D, nº 12 Sevilla"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Correo electrónico oficial</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="neumacarmotors85@gmail.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* 1. Logo de la Empresa Settings (Upper Right Header Box) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5 text-primary" /> Logo de la Empresa (Encabezado Superior Derecho)
            </CardTitle>
            <CardDescription>
              Este logo aparecerá exclusivamente en la caja superior derecha de la franja azul de la nómina.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subir Imagen del Logo (PNG / JPG)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "logoUrl")}
              />
            </div>

            {settings.logoUrl ? (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Vista Previa del Logo del Encabezado:</Label>
                <div className="mt-2 border rounded-md p-3 max-w-xs flex justify-center bg-slate-900">
                  <img src={settings.logoUrl} alt="Logo Encabezado" className="max-h-20 object-contain" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="mt-2 text-xs text-red-500"
                >
                  Quitar Logo
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No se ha subido ningún logo. Se mostrará la caja por defecto.</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Company Stamp & Signature Settings (Bottom Left Box) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stamp className="size-5 text-primary" /> Sello y Firma de la Empresa (Bloque Inferior Izquierdo)
            </CardTitle>
            <CardDescription>
              Este sello/firma aparecerá automáticamente en el bloque &quot;Firma de la Empresa&quot; al pie de todas las nóminas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 border-b border-border pb-3">
              <Button
                type="button"
                variant={stampTab === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setStampTab("draw")}
              >
                Dibujar Firma / Sello
              </Button>
              <Button
                type="button"
                variant={stampTab === "upload" ? "default" : "outline"}
                size="sm"
                onClick={() => setStampTab("upload")}
              >
                <Upload className="mr-1.5 size-3.5" /> Subir Imagen de Sello (PNG/JPG)
              </Button>
            </div>

            {stampTab === "draw" ? (
              <div className="space-y-2">
                <Label>Dibujar Firma de Empresa</Label>
                <SignatureCanvas
                  initialImage={settings.stampUrl}
                  onSave={(dataUrl) => {
                    setSettings((prev) => {
                      const updated = { ...prev, stampUrl: dataUrl };
                      saveCompanySettings(updated);
                      return updated;
                    });
                    toast.success("Firma/Sello de empresa guardado con éxito");
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Subir archivo de Imagen del Sello</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "stampUrl")}
                />
              </div>
            )}

            {settings.stampUrl ? (
              <div className="pt-3">
                <Label className="text-xs text-muted-foreground">Vista Previa del Sello / Firma de Empresa:</Label>
                <div className="mt-2 border rounded-md p-3 max-w-xs flex justify-center bg-slate-50">
                  <img src={settings.stampUrl} alt="Vista Previa Sello" className="max-h-24 object-contain" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveStamp}
                  className="mt-2 text-xs text-red-500"
                >
                  Quitar Sello
                </Button>

              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No se ha asignado sello. Se utilizará el sello con texto por defecto.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            <Save className="mr-2 size-4" /> Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}

