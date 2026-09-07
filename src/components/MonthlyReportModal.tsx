import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatEuro, formatHours, MONTHS_ES } from "@/lib/hours";
import { getCompanySettings } from "@/lib/company.settings";
import { Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadPayrollDocumentPdf, printPayrollDocument } from "@/lib/pdf.utils";
import { SignatureCanvas } from "./SignatureCanvas";

interface MonthlyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  year: number;
  month: number;
  entries: any[];
}

export function MonthlyReportModal({
  open,
  onOpenChange,
  employee,
  year,
  month,
  entries,
}: MonthlyReportModalProps) {
  if (!employee) return null;

  const company = getCompanySettings();
  const [workerSignature, setWorkerSignature] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const monthName = MONTHS_ES[month - 1] || "Periodo";
  const fileName = `Registro_Jornada_${(employee.full_name || "Empleado").replace(/\s+/g, "_")}_${monthName}_${year}.pdf`;

  // Get total days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayRows = [];

  let totalNormalHoursMonth = 0;
  let totalOvertimeHoursMonth = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dateIsoStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayEntries = entries.filter((e: any) => {
      const eDate = new Date(e.clock_in);
      return (
        eDate.getFullYear() === year &&
        eDate.getMonth() === month - 1 &&
        eDate.getDate() === day
      );
    });

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHolidayObj = (company.holidays || []).find((h) => h.date === dateIsoStr);

    let clockInTime = "-";
    let clockOutTime = "-";
    let breakMins = 0;
    let normH = 0;
    let extraH = 0;

    if (dayEntries.length > 0) {
      const firstIn = dayEntries[0].clock_in;
      const lastOut = dayEntries[dayEntries.length - 1].clock_out;

      clockInTime = new Date(firstIn).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      clockOutTime = lastOut
        ? new Date(lastOut).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "En curso";

      dayEntries.forEach((e: any) => {
        breakMins += Number(e.break_minutes || 0);
        if (e.clock_in && e.clock_out) {
          const diffMs = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
          const totalH = Math.max(0, diffMs / 3600000 - Number(e.break_minutes || 0) / 60);
          const weeklyNorm = Number(employee.weekly_hours || 40) / 5;
          if (totalH > weeklyNorm) {
            normH += weeklyNorm;
            extraH += totalH - weeklyNorm;
          } else {
            normH += totalH;
          }
        }
      });
    }

    totalNormalHoursMonth += normH;
    totalOvertimeHoursMonth += extraH;

    const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });

    let statusNote = "";
    if (dayEntries.length > 0) {
      statusNote = isHolidayObj ? `Festivo (${isHolidayObj.name})` : "Trabajado";
    } else if (isHolidayObj) {
      statusNote = `Festivo (${isHolidayObj.name})`;
    } else if (isWeekend) {
      statusNote = "Fin de semana";
    } else {
      statusNote = "-";
    }

    dayRows.push({
      dayNumber: String(day).padStart(2, "0"),
      dayName: dayName.toUpperCase(),
      dateFormatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
      clockInTime,
      clockOutTime,
      breakMins: breakMins > 0 ? `${breakMins} min` : "-",
      normH: normH > 0 ? `${normH.toFixed(1)}h` : "-",
      extraH: extraH > 0 ? `${extraH.toFixed(1)}h` : "-",
      statusNote,
      isWeekend,
      isHoliday: !!isHolidayObj,
      hasEntries: dayEntries.length > 0,
    });
  }

  const handleDownloadPdf = async () => {
    toast.info("Generando PDF del registro mensual...");
    setIsGeneratingPdf(true);
    try {
      await downloadPayrollDocumentPdf("monthly-report-document", fileName);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    printPayrollDocument("monthly-report-document");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:shadow-none print:bg-transparent">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Registro Diario de Jornada - {employee.full_name}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="text-blue-600 border-blue-500/30 hover:bg-blue-50"
              >
                <Download className="mr-1.5 size-4" />
                {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="mr-1.5 size-4" /> Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Official Monthly Report */}
        <div
          id="monthly-report-document"
          className="bg-white text-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 print:border-none print:shadow-none space-y-5 print:w-full print:m-0"
        >
          {/* Header Banner */}
          <div className="bg-[#1e3246] text-white p-5 rounded-t-md flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-wide uppercase">
                REGISTRO DIARIO DE JORNADA (RD 8/2019)
              </h2>
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                EMPRESA: {company.name} (CIF: {company.cif})
              </p>
              <p className="text-xs text-slate-300">
                TRABAJADOR: <span className="font-bold text-white">{employee.full_name}</span> | DNI: {employee.dni || "N/A"} | PERIODO: <span className="font-semibold text-amber-400">{monthName.toUpperCase()} {year}</span>
              </p>
            </div>
            <div className="bg-white/10 p-2 rounded border border-white/20 text-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-200 block">JORNADA</span>
              <span className="text-sm font-extrabold text-white">{employee.weekly_hours || 40}h/sem</span>
            </div>
          </div>

          {/* Table Day-by-Day */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#e8ecef] text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Fecha</th>
                  <th className="p-2 border-r border-slate-300 text-center">Día</th>
                  <th className="p-2 border-r border-slate-300 text-center">Entrada</th>
                  <th className="p-2 border-r border-slate-300 text-center">Salida</th>
                  <th className="p-2 border-r border-slate-300 text-center">Pausa</th>
                  <th className="p-2 border-r border-slate-300 text-center">Horas Norm.</th>
                  <th className="p-2 border-r border-slate-300 text-center">Horas Ext.</th>
                  <th className="p-2">Estado / Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dayRows.map((r) => (
                  <tr
                    key={r.dayNumber}
                    className={
                      r.isHoliday
                        ? "bg-amber-50/60"
                        : r.isWeekend
                        ? "bg-slate-50/80 text-slate-500"
                        : ""
                    }
                  >
                    <td className="p-2 font-medium border-r border-slate-200">{r.dateFormatted}</td>
                    <td className="p-2 text-center font-bold border-r border-slate-200">{r.dayName}</td>
                    <td className="p-2 text-center border-r border-slate-200">{r.clockInTime}</td>
                    <td className="p-2 text-center border-r border-slate-200">{r.clockOutTime}</td>
                    <td className="p-2 text-center border-r border-slate-200">{r.breakMins}</td>
                    <td className="p-2 text-center font-semibold border-r border-slate-200">{r.normH}</td>
                    <td className="p-2 text-center font-semibold text-amber-700 border-r border-slate-200">{r.extraH}</td>
                    <td className="p-2 font-medium">{r.statusNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly Totals Card */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-300">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Horas Ordinarias</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{totalNormalHoursMonth.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Horas Extras</p>
              <p className="text-base font-bold text-amber-700 mt-0.5">{totalOvertimeHoursMonth.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Horas Mes</p>
              <p className="text-base font-bold text-blue-900 mt-0.5">{(totalNormalHoursMonth + totalOvertimeHoursMonth).toFixed(2)}h</p>
            </div>
          </div>

          {/* Signatures Block */}
          <div className="pt-4 grid grid-cols-2 gap-8 border-t border-slate-300">
            {/* Left: FIRMA Y SELLO DE LA EMPRESA */}
            <div className="flex flex-col items-center justify-end text-center space-y-2">
              <div className="min-h-[90px] flex items-center justify-center">
                {company.stampUrl ? (
                  <img src={company.stampUrl} crossOrigin="anonymous" alt="Sello Empresa" className="max-h-20 object-contain" />
                ) : (
                  <div className="border border-blue-900 rounded p-2 text-blue-900 font-bold text-xs">
                    <p className="text-xs font-bold">{company.name}</p>
                    <p className="text-[10px]">CIF: {company.cif}</p>
                  </div>
                )}
              </div>
              <div className="w-full border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-700">Firma y Sello de la Empresa</p>
              </div>
            </div>

            {/* Right: FIRMA DEL TRABAJADOR */}
            <div className="flex flex-col items-center justify-end text-center space-y-2">
              <div className="min-h-[90px] w-full flex items-center justify-center">
                {workerSignature ? (
                  <img src={workerSignature} alt="Firma Trabajador" className="max-h-20 object-contain" />
                ) : (
                  <div className="w-full print:hidden">
                    <SignatureCanvas onSave={(url) => setWorkerSignature(url)} />
                  </div>
                )}
              </div>
              <div className="w-full border-t border-slate-400 pt-1">
                <p className="text-xs font-bold text-slate-700">Firma del Trabajador ({employee.full_name})</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 text-[10px] text-slate-500">
            Documento de control de asistencia generado electrónicamente conforme al Art. 34.9 del Estatuto de los Trabajadores.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
