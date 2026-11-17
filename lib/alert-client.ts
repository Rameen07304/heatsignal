import type { AlertInput, AlertText, HeatAlert } from "./alert-types";
import type { City } from "./cities";
import type { CombinedHour } from "./conditions";
import type { CompoundLevel, RiskLevel } from "./risk";

/** Request body for /api/alert from one hour of conditions. */
export function alertBody(city: City, h: CombinedHour, extra: Record<string, unknown> = {}) {
  return {
    city: [city.name, city.country].filter(Boolean).join(", "),
    lat: city.lat,
    lon: city.lon,
    weather: { temperature: h.temp, humidity: h.rh, wind: h.wind, solar: h.solar },
    airQuality: h.air
      ? { aqi: h.air.aqi, pm25: h.air.pm25, pm10: h.air.pm10, o3: h.air.o3, no2: h.air.no2, dust: h.air.dust, uv: h.air.uv }
      : null,
    ...extra,
  };
}

/** The same AlertInput the server builds, for client-side rule-based text (reports). */
export function hourToInput(city: City, h: CombinedHour): AlertInput {
  return {
    city: [city.name, city.country].filter(Boolean).join(", "),
    lat: city.lat,
    lon: city.lon,
    temperature: h.temp,
    humidity: h.rh,
    wind: h.wind,
    solar: h.solar,
    wbgt: h.wbgt,
    heatRisk: h.risk,
    air: h.air ? { aqi: h.air.aqi, pm25: h.air.pm25, pm10: h.air.pm10, o3: h.air.o3, no2: h.air.no2, dust: h.air.dust, uv: h.air.uv } : undefined,
    score: h.score,
    level: h.level,
  };
}

export async function postAlert<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

// ---- Alert history: kept in this browser only. ----

export interface HistoryEntry {
  id: string;
  /** ISO timestamp of generation. */
  at: string;
  city: string;
  lat: number;
  lon: number;
  wbgt: number;
  heatRisk: RiskLevel;
  aqi: number | null;
  score: number | null;
  level: CompoundLevel | null;
  mode: "single" | "pipeline";
  alert: HeatAlert;
}

const KEY = "heatsignal-alert-history";
const LIMIT = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveToHistory(city: City, h: CombinedHour, alert: HeatAlert, mode: HistoryEntry["mode"]) {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    city: [city.name, city.country].filter(Boolean).join(", "),
    lat: city.lat,
    lon: city.lon,
    wbgt: h.wbgt,
    heatRisk: h.risk,
    aqi: h.air?.aqi ?? null,
    score: h.score,
    level: h.level,
    mode,
    alert,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...loadHistory()].slice(0, LIMIT)));
    window.dispatchEvent(new Event("heatsignal-history"));
  } catch {} // storage full or disabled — the alert is still shown
  return entry;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("heatsignal-history"));
  } catch {}
}

/** Plain-text version of an alert, for copying into WhatsApp, SMS or email. */
export function alertToText(title: string, alert: HeatAlert): string {
  const block = (t: AlertText, h: readonly string[]) =>
    [
      t.risk_assessment,
      `\n${h[0]}:`,
      ...t.vulnerable_groups.map((g) => `• ${g}`),
      `\n${h[1]}:`,
      ...t.actions.map((a) => `• ${a}`),
      `\n${h[2]}:`,
      ...t.worker_safety.map((a) => `• ${a}`),
    ].join("\n");
  return [
    title,
    "",
    block(alert.en, ["Who is at risk", "What to do", "Worker safety"]),
    ...(alert.ur ? ["", "— اردو —", block(alert.ur, ["کون زیادہ خطرے میں ہے", "کیا کریں", "مزدوروں کی حفاظت"])] : []),
    ...(alert.ar ? ["", "— العربية —", block(alert.ar, ["الفئات الأكثر عرضة", "ماذا تفعل", "سلامة العمال"])] : []),
    "",
    "— HeatSignal",
  ].join("\n");
}
