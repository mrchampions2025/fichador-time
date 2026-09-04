import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";

// Mutex to prevent duplicate PDF generation
let _pdfBusy = false;

/**
 * Converts all <img> elements inside a container to inline base64 data URIs
 * so html2canvas can render them without CORS/taint issues.
 */
async function inlineImages(container: HTMLElement): Promise<void> {
  const imgs = container.querySelectorAll("img");
  const promises = Array.from(imgs).map(async (img) => {
    if (!img.src || img.src.startsWith("data:")) return; // already inline
    try {
      const resp = await fetch(img.src);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      img.src = dataUrl;
    } catch {
      // If fetch fails, leave as-is; html2canvas will skip it
    }
  });
  await Promise.all(promises);
}

/**
 * Core: captures the payroll-document element as a jsPDF instance.
 * Returns null on failure.
 */
async function capturePdf(elementId: string): Promise<jsPDF | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("No se encontró el documento de la nómina.");
    return null;
  }

  // Add temporary class to replace oklch colors with hex for PDF generation
  document.body.classList.add('pdf-export');
  await inlineImages(element);

  const imgData = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (node instanceof HTMLElement) {
        return !(node.classList?.contains("print:hidden") || node.hasAttribute("data-no-pdf"));
      }
      return true;
    },
  });

  document.body.classList.remove('pdf-export');

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (element.offsetHeight * pageWidth) / element.offsetWidth;

  // Handle multi-page if the content is taller than one A4 page
  let position = 0;
  let remaining = imgHeight;

  while (remaining > 0) {
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    remaining -= pageHeight;
    position -= pageHeight;
    if (remaining > 0) {
      pdf.addPage();
    }
  }

  return pdf;
}

// ─── Public API ───────────────────────────────────────────────

export async function viewPayrollDocumentPdf(
  elementId = "payroll-document"
): Promise<boolean> {
  if (_pdfBusy) return false;
  _pdfBusy = true;

  try {
    toast.info("Generando vista previa del PDF…");
    const pdf = await capturePdf(elementId);
    if (!pdf) { _pdfBusy = false; return false; }

    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open in a new tab
    const w = window.open(blobUrl, "_blank");
    if (!w) {
      // Popup blocked — fallback to download
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    toast.success("PDF generado con éxito");
    return true;
  } catch (err) {
    console.error("viewPayrollDocumentPdf error:", err);
    toast.error("Error al generar la vista previa del PDF.");
    return false;
  } finally {
    _pdfBusy = false;
  }
}

export async function downloadPayrollDocumentPdf(
  elementId = "payroll-document",
  fileName = "Nomina.pdf"
): Promise<boolean> {
  if (_pdfBusy) return false;
  _pdfBusy = true;

  try {
    toast.info("Generando PDF para descarga…");
    const pdf = await capturePdf(elementId);
    if (!pdf) { _pdfBusy = false; return false; }

    // Use blob + anchor to force download (more reliable than pdf.save)
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    toast.success("Nómina descargada en formato PDF");
    return true;
  } catch (err) {
    console.error("downloadPayrollDocumentPdf error:", err);
    toast.error("Error al descargar el archivo PDF.");
    return false;
  } finally {
    _pdfBusy = false;
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
