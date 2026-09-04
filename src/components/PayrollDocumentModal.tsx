import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureCanvas } from "./SignatureCanvas";
import { formatEuro, MONTHS_ES } from "@/lib/hours";
import { getCompanySettings } from "@/lib/company.settings";
import { Printer, Share2, Download, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type AdjustmentItem = {
  id: string;
  type: "anticipo" | "descuento" | "extra" | "bono";
  note: string;
  amount: number;
};

interface PayrollDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: any;
  onSaveSignature?: (payrollId: string, signatureDataUrl: string) => void;
  onSaveAdjustments?: (payrollId: string, adjustments: AdjustmentItem[], total: number) => void;
}

export function PayrollDocumentModal({
  open,
  onOpenChange,
  payroll,
  onSaveSignature,
  onSaveAdjustments,
}: PayrollDocumentModalProps) {
  if (!payroll) return null;

  const company = getCompanySettings();
  const [workerSignature, setWorkerSignature] = useState<string>(
    payroll.worker_signature || ""
  );
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>(
    payroll.adjustments || [
      { id: "1", type: "anticipo", note: "Anticipo / Descuentos", amount: Number(payroll.deductions || 0) },
      { id: "2", type: "extra", note: "Gastos / Trabajos Extras", amount: Number(payroll.bonuses || 0) },
    ]
  );
  const [newNote, setNewNote] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"anticipo" | "extra">("anticipo");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const emp = payroll.employees || {};
  const monthName = MONTHS_ES[(payroll.period_month || 1) - 1] || "Periodo";
  const year = payroll.period_year || new Date().getFullYear();

  const baseAmount = Number(payroll.base_amount || 0);
  const overtimeAmount = Number(payroll.overtime_amount || 0);
  const subtotal = baseAmount + overtimeAmount;

  const totalDiscounts = adjustments
    .filter((a) => a.type === "anticipo" || a.type === "descuento")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExtras = adjustments
    .filter((a) => a.type === "extra" || a.type === "bono")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalToPay = subtotal - totalDiscounts + totalExtras;

  const handleAddAdjustment = () => {
    if (!newNote || !newAmount) return;
    const item: AdjustmentItem = {
      id: Date.now().toString(),
      type: newType,
      note: newNote,
      amount: Math.abs(Number(newAmount)),
    };
    const updated = [...adjustments, item];
    setAdjustments(updated);
    setNewNote("");
    setNewAmount("");
    if (onSaveAdjustments) {
      onSaveAdjustments(payroll.id, updated, totalToPay);
    }
  };

  const handleRemoveAdjustment = (id: string) => {
    const updated = adjustments.filter((a) => a.id !== id);
    setAdjustments(updated);
    if (onSaveAdjustments) {
      onSaveAdjustments(payroll.id, updated, totalToPay);
    }
  };

  const handleSaveSignature = (dataUrl: string) => {
    setWorkerSignature(dataUrl);
    if (onSaveSignature) {
      onSaveSignature(payroll.id, dataUrl);
    }
    toast.success("Firma del trabajador guardada con éxito");
  };

  const handleWhatsAppShare = () => {
    const phone = emp.phone ? emp.phone.replace(/\D/g, "") : "";
    const text = encodeURIComponent(
      `Hola ${emp.full_name || "Empleado"},\n` +
      `Aquí tienes el resumen de tu nómina de ${monthName} ${year} (${company.name}):\n\n` +
      `• Sub-total: ${formatEuro(subtotal)}\n` +
      `• Anticipos/Descuentos: ${formatEuro(totalDiscounts)}\n` +
      `• Gastos/Trabajos Extras: ${formatEuro(totalExtras)}\n` +
      `• TOTAL A PAGAR: ${formatEuro(totalToPay)}\n\n` +
      `Puedes acceder al panel para revisar y firmar digitalmente tu nómina.`
    );
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
  };

  const handleViewPdf = async () => {
    const element = document.getElementById("payroll-document");
    if (!element) return;
    setIsGeneratingPdf(true);
    toast.info("Generando vista de PDF...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Vista de PDF abierta en nueva pestaña");
    } catch (error) {
      console.error("Error al visualizar PDF:", error);
      toast.error("Error al generar la vista del PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("payroll-document");
    if (!element) return;
    setIsGeneratingPdf(true);
    toast.info("Generando archivo PDF...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const fileName = `Nomina_${(emp.full_name || "Empleado").replace(/\s+/g, "_")}_${monthName}_${year}.pdf`;
      pdf.save(fileName);
      toast.success("Nómina descargada en formato PDF");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al descargar el archivo PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:shadow-none print:bg-transparent">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Nómina - {emp.full_name || "Empleado"}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleViewPdf} disabled={isGeneratingPdf} className="text-violet-600 border-violet-500/30 hover:bg-violet-50">
                <Eye className="mr-1.5 size-4" /> Ver PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="text-blue-600 border-blue-500/30 hover:bg-blue-50">
                <Download className="mr-1.5 size-4" /> {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="mr-1.5 size-4" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-50">
                <Share2 className="mr-1.5 size-4" /> WhatsApp
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>


        {/* Printable Payroll Container (Renders 100% identically for Screen, Print, and PDF) */}
        <div id="payroll-document" className="bg-white text-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 print:border-none print:shadow-none space-y-6 print:w-full print:m-0">
          
          {/* 1. Header Banner */}
          <div className="bg-[#1e3246] text-white p-6 rounded-t-md relative flex flex-row items-center justify-between gap-4">
            <div className="text-left space-y-1">
              <h2 className="text-2xl font-bold tracking-wider uppercase">
                PAGOS DE {monthName} {year}
              </h2>
              <p className="text-sm font-semibold tracking-wide text-slate-200">
                {company.name}
              </p>
              <p className="text-xs text-slate-300">
                Nómina de <span className="font-semibold text-white">{emp.full_name || "Empleado"}</span> - DNI: {emp.dni || "N/A"}
              </p>
            </div>

            {/* Top Right: COMPANY LOGO (logoUrl) */}
            <div className="bg-white/10 p-2 rounded border border-white/20 flex items-center justify-center min-w-[120px] min-h-[60px]">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo Empresa" className="h-14 object-contain max-w-[140px]" />
              ) : (
                <div className="text-center p-1">
                  <div className="text-xs font-bold text-amber-400">NEUMACAR</div>
                  <div className="text-[10px] text-slate-300">MOTORS</div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Work Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#e8ecef] text-slate-700 font-semibold border-b border-slate-300">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3 text-center">Horas Norm.</th>
                  <th className="p-3 text-center">Horas Ext.</th>
                  <th className="p-3 text-right">Precio Unit.</th>
                  <th className="p-3 text-right">Total (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-medium">01 {monthName.toLowerCase()} {year}</td>
                  <td className="p-3">Jornada Ordinaria ({payroll.normal_hours || 0} hrs)</td>
                  <td className="p-3 text-center">{payroll.normal_hours || 0}h</td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-right">{formatEuro(Number(emp.hourly_rate || 12))}</td>
                  <td className="p-3 text-right font-semibold">{formatEuro(baseAmount)}</td>
                </tr>
                {Number(payroll.overtime_hours || 0) > 0 && (
                  <tr>
                    <td className="p-3 font-medium">Periodo {monthName}</td>
                    <td className="p-3">Horas Extraordinarias (Recargo {emp.overtime_multiplier || 1.5}x)</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center">{payroll.overtime_hours}h</td>
                    <td className="p-3 text-right">{formatEuro(Number(emp.hourly_rate || 12) * Number(emp.overtime_multiplier || 1.5))}</td>
                    <td className="p-3 text-right font-semibold">{formatEuro(overtimeAmount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3. 4 Colored KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Sub-total (Green Accent) */}
            <div className="bg-slate-50 p-4 rounded-md border-l-4 border-emerald-500 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SUB-TOTAL</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatEuro(subtotal)}</p>
            </div>

            {/* Card 2: Anticipos / Descuentos (Orange Accent) */}
            <div className="bg-slate-50 p-4 rounded-md border-l-4 border-amber-500 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ANTICIPOS / DESCUENTOS</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatEuro(totalDiscounts)}</p>
            </div>

            {/* Card 3: Gastos / Trabajos Extras (Purple Accent) */}
            <div className="bg-slate-50 p-4 rounded-md border-l-4 border-violet-500 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GASTOS / EXTRAS</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatEuro(totalExtras)}</p>
            </div>

            {/* Card 4: Total a Pagar (Blue Accent) */}
            <div className="bg-slate-50 p-4 rounded-md border-l-4 border-sky-500 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL A PAGAR</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatEuro(totalToPay)}</p>
            </div>
          </div>

          {/* 4. Breakdown Table of Adjustments */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Desglose de Conceptos y Ajustes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#e8ecef] text-slate-700 font-semibold border-b border-slate-300">
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Concepto / Nota</th>
                    <th className="p-2.5 text-right">Monto (€)</th>
                    <th className="p-2.5 text-center print:hidden">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {adjustments.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2.5 font-medium capitalize">
                        {a.type === "anticipo" || a.type === "descuento" ? "Anticipos / Descuentos" : "Gastos / Trabajos Extras"}
                      </td>
                      <td className="p-2.5">{a.note}</td>
                      <td className="p-2.5 text-right font-semibold">
                        {a.type === "anticipo" || a.type === "descuento" ? `-${formatEuro(a.amount)}` : formatEuro(a.amount)}
                      </td>
                      <td className="p-2.5 text-center print:hidden">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAdjustment(a.id)} className="h-7 w-7 text-red-500">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form to add custom adjustment item (hidden in print) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 print:hidden bg-slate-50 p-3 rounded border border-slate-200">
              <select
                value={newType}
                onChange={(e: any) => setNewType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="anticipo">Anticipo / Descuento</option>
                <option value="extra">Gasto / Trabajo Extra</option>
              </select>
              <Input
                placeholder="Concepto (ej: gasolina, anticipo)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Importe (€)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="h-9 text-xs"
              />
              <Button size="sm" onClick={handleAddAdjustment} className="h-9">
                <Plus className="mr-1 size-3.5" /> Añadir Concepto
              </Button>
            </div>
          </div>

          {/* 5. Signatures Block */}
          <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200">
            {/* Left: FIRMA Y SELLO DE LA EMPRESA (stampUrl) */}
            <div className="flex flex-col items-center justify-end text-center space-y-2">
              <div className="min-h-[100px] flex items-center justify-center">
                {company.stampUrl ? (
                  <img src={company.stampUrl} alt="Sello y Firma Empresa" className="max-h-24 object-contain" />
                ) : (
                  <div className="border-2 border-blue-800 rounded p-2 text-blue-900 font-bold text-xs leading-snug">
                    <p className="text-sm font-extrabold">{company.name}</p>
                    <p>CIF: {company.cif}</p>
                    <p className="text-[10px]">{company.address}</p>
                    <p className="text-[10px]">{company.phone}</p>
                    <p className="text-[9px] underline">{company.email}</p>
                  </div>
                )}
              </div>
              <div className="w-full border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-700">Firma de la Empresa</p>
              </div>
            </div>

            {/* Right: FIRMA DEL TRABAJADOR (workerSignature) */}
            <div className="flex flex-col items-center justify-end text-center space-y-2">
              <div className="min-h-[100px] w-full flex items-center justify-center">
                {workerSignature ? (
                  <div className="relative group w-full flex justify-center">
                    <img src={workerSignature} alt="Firma Trabajador" className="max-h-24 object-contain" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWorkerSignature("")}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-xs"
                    >
                      Re-firmar
                    </Button>
                  </div>
                ) : (
                  <div className="w-full print:hidden">
                    <SignatureCanvas onSave={handleSaveSignature} />
                  </div>
                )}
              </div>
              <div className="w-full border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-700">Firma del Trabajador</p>
              </div>
            </div>
          </div>

          {/* 6. Footer Payment Date */}
          <div className="text-center pt-4 text-xs text-slate-500">
            Fecha de pago: {new Date(payroll.generated_at || Date.now()).toLocaleDateString("es-ES")}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
