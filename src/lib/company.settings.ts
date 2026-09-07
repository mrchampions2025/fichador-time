export type HolidayItem = {
  id: string;
  date: string;
  name: string;
};

export type CompanySettings = {
  name: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  stampUrl?: string;
  holidays?: HolidayItem[];
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "NEUMACAR MOTORS",
  cif: "B24919898",
  address: "Plg. Ind. Autopista C/ D, nº 12 Sevilla",
  phone: "Móvil: 617 038 528 - 632 406 008",
  email: "neumacarmotors85@gmail.com",
  stampUrl: "",
  holidays: [
    { id: "h1", date: "2026-01-01", name: "Año Nuevo" },
    { id: "h2", date: "2026-01-06", name: "Epifanía del Señor" },
    { id: "h3", date: "2026-05-01", name: "Fiesta del Trabajo" },
    { id: "h4", date: "2026-10-12", name: "Fiesta Nacional de España" },
    { id: "h5", date: "2026-11-01", name: "Todos los Santos" },
    { id: "h6", date: "2026-12-06", name: "Día de la Constitución" },
    { id: "h7", date: "2026-12-08", name: "Inmaculada Concepción" },
    { id: "h8", date: "2026-12-25", name: "Natividad del Señor" },
  ],
};

const STORAGE_KEY = "taller_company_settings";

export function getCompanySettings(): CompanySettings {
  if (typeof window === "undefined") return DEFAULT_COMPANY_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error("Error reading company settings:", e);
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export function saveCompanySettings(settings: CompanySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving company settings:", e);
  }
}
