export type CompanySettings = {
  name: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  stampUrl?: string;
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "NEUMACAR MOTORS",
  cif: "B24919898",
  address: "Plg. Ind. Autopista C/ D, nº 12 Sevilla",
  phone: "Móvil: 617 038 528 - 632 406 008",
  email: "neumacarmotors85@gmail.com",
  stampUrl: "",
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
