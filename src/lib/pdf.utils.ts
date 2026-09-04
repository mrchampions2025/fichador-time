import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export async function viewPayrollDocumentPdf(elementId = "payroll-document"): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("No se encontró el documento de la nómina para generar el PDF.");
    return false;
  }

  // Pre-open window synchronously to bypass browser popup blockers
  const pdfWindow = window.open("", "_blank");
  if (pdfWindow) {
    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Generando Vista de PDF...</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155; }
            .spinner { border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div style="text-align:center;">
            <div class="spinner"></div>
            <h3 style="margin:0 0 8px;">Cargando vista previa en PDF...</h3>
            <p style="margin:0;font-size:14px;color:#64748b;">Por favor espere mientras se prepara el documento.</p>
          </div>
        </body>
      </html>
    `);
  }

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
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    if (pdfWindow) {
      pdfWindow.location.href = blobUrl;
    } else {
      window.location.href = blobUrl;
    }
    toast.success("PDF generado y abierto con éxito");
    return true;
  } catch (error) {
    console.error("Error al visualizar PDF:", error);
    if (pdfWindow) pdfWindow.close();
    toast.error("Error al generar la vista previa del PDF");
    return false;
  }
}

export async function downloadPayrollDocumentPdf(
  elementId = "payroll-document",
  fileName = "Nomina.pdf"
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("No se encontró el documento de la nómina para descargar.");
    return false;
  }

  try {
    toast.info("Generando archivo PDF para descarga...");
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
    pdf.save(fileName);
    toast.success("Nómina descargada en formato PDF");
    return true;
  } catch (error) {
    console.error("Error al descargar PDF:", error);
    toast.error("Error al descargar el archivo PDF");
    return false;
  }
}

export function printPayrollDocument(elementId = "payroll-document"): void {
  const elem = document.getElementById(elementId);
  if (!elem) {
    toast.error("No se encontró el documento para imprimir");
    return;
  }

  document.body.classList.add("printing-payroll");
  
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-payroll");
    }, 500);
  }, 100);
}
