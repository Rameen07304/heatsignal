/** Emergency numbers by country. Verify locally — numbers can change. */
const NUMBERS: Record<string, { number: string; label: string }[]> = {
  Pakistan: [{ number: "1122", label: "Rescue" }, { number: "115", label: "Edhi ambulance" }],
  "United Arab Emirates": [{ number: "998", label: "Ambulance" }, { number: "999", label: "Emergency" }],
  "Saudi Arabia": [{ number: "997", label: "Ambulance" }, { number: "911", label: "Emergency" }],
  India: [{ number: "108", label: "Ambulance" }, { number: "112", label: "Emergency" }],
  Japan: [{ number: "119", label: "Fire / ambulance" }],
  "United States": [{ number: "911", label: "Emergency" }],
  Egypt: [{ number: "123", label: "Ambulance" }],
};

export function emergencyNumbers(country: string) {
  return NUMBERS[country] ?? null;
}

/** Short form for one line, e.g. "1122 (Rescue)". */
export function emergencyLine(country: string) {
  const n = emergencyNumbers(country);
  return n ? n.map((x) => `${x.number} (${x.label})`).join(" · ") : "your local emergency number";
}
