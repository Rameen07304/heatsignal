/** Emergency numbers by country (the first is the one to call for an ambulance). Verify locally; numbers can change. */
const NUMBERS: Record<string, { number: string; label: string }[]> = {
  Pakistan: [{ number: "1122", label: "Rescue" }, { number: "115", label: "Edhi ambulance" }],
  "United Arab Emirates": [{ number: "998", label: "Ambulance" }, { number: "999", label: "Police" }],
  "Saudi Arabia": [{ number: "997", label: "Ambulance" }, { number: "911", label: "Emergency" }],
  Qatar: [{ number: "999", label: "Emergency" }],
  Kuwait: [{ number: "112", label: "Emergency" }],
  Bahrain: [{ number: "999", label: "Emergency" }],
  Oman: [{ number: "9999", label: "Emergency" }],
  Jordan: [{ number: "911", label: "Emergency" }],
  Iran: [{ number: "115", label: "Ambulance" }],
  "Türkiye": [{ number: "112", label: "Emergency" }],
  Egypt: [{ number: "123", label: "Ambulance" }],
  Morocco: [{ number: "15", label: "Ambulance" }],
  India: [{ number: "108", label: "Ambulance" }, { number: "112", label: "Emergency" }],
  Bangladesh: [{ number: "999", label: "Emergency" }],
  Nepal: [{ number: "102", label: "Ambulance" }],
  "Sri Lanka": [{ number: "1990", label: "Ambulance" }],
  China: [{ number: "120", label: "Ambulance" }],
  Taiwan: [{ number: "119", label: "Fire / ambulance" }],
  Japan: [{ number: "119", label: "Fire / ambulance" }],
  "South Korea": [{ number: "119", label: "Fire / ambulance" }],
  Vietnam: [{ number: "115", label: "Ambulance" }],
  Thailand: [{ number: "1669", label: "Ambulance" }],
  Malaysia: [{ number: "999", label: "Emergency" }],
  Singapore: [{ number: "995", label: "Ambulance" }],
  Philippines: [{ number: "911", label: "Emergency" }],
  Australia: [{ number: "000", label: "Emergency" }],
  Nigeria: [{ number: "112", label: "Emergency" }],
  Ghana: [{ number: "112", label: "Emergency" }],
  Kenya: [{ number: "999", label: "Emergency" }, { number: "112", label: "Emergency" }],
  "South Africa": [{ number: "10177", label: "Ambulance" }, { number: "112", label: "From a mobile" }],
  France: [{ number: "15", label: "Ambulance (SAMU)" }, { number: "112", label: "Emergency" }],
  Spain: [{ number: "112", label: "Emergency" }],
  Italy: [{ number: "118", label: "Ambulance" }, { number: "112", label: "Emergency" }],
  Greece: [{ number: "166", label: "Ambulance" }, { number: "112", label: "Emergency" }],
  "United States": [{ number: "911", label: "Emergency" }],
  Mexico: [{ number: "911", label: "Emergency" }],
  Cuba: [{ number: "104", label: "Ambulance" }],
  Panama: [{ number: "911", label: "Emergency" }],
  Colombia: [{ number: "123", label: "Emergency" }],
  Ecuador: [{ number: "911", label: "Emergency" }],
  Brazil: [{ number: "192", label: "Ambulance (SAMU)" }],
  Argentina: [{ number: "107", label: "Ambulance" }],
  Paraguay: [{ number: "911", label: "Emergency" }],
};

export const EMERGENCY_COUNTRIES = Object.keys(NUMBERS).sort();

export function emergencyNumbers(country: string) {
  return NUMBERS[country] ?? null;
}

/** Translation keys for the service labels above (brand names in brackets stay as they are). */
export const SERVICE_KEY: Record<string, string> = {
  Emergency: "svcEmergency",
  Ambulance: "svcAmbulance",
  "Fire / ambulance": "svcFireAmbulance",
  "Ambulance (SAMU)": "svcAmbulance",
  Rescue: "svcRescue",
  Police: "svcPolice",
  "From a mobile": "svcFromMobile",
  "Edhi ambulance": "svcAmbulance",
};
const BRAND: Record<string, string> = { "Ambulance (SAMU)": " (SAMU)", "Edhi ambulance": " (Edhi)" };

/** A service label in the current language; `tr` maps a translation key to text. */
export const serviceLabel = (label: string, tr?: (key: string) => string) =>
  tr && SERVICE_KEY[label] ? tr(SERVICE_KEY[label]) + (BRAND[label] ?? "") : label;

/** Short form for one line, e.g. "1122 (Rescue)". `tr` translates labels and the fallback. */
export function emergencyLine(country: string, tr?: (key: string) => string) {
  const n = emergencyNumbers(country);
  return n
    ? n.map((x) => `${x.number} (${serviceLabel(x.label, tr)})`).join(" · ")
    : tr ? tr("localEmergencyNumber") : "your local emergency number";
}
