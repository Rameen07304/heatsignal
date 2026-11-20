import type { Key } from "./i18n/en";

export type Intensity = "light" | "moderate" | "heavy";

export const INTENSITIES: { key: Intensity; label: string; examples: string; labelKey: Key; examplesKey: Key }[] = [
  { key: "light", label: "Light", examples: "walking, shopping, supervising, driving", labelKey: "workLight", examplesKey: "workLightExamples" },
  { key: "moderate", label: "Moderate", examples: "farming, bricklaying, carrying loads, cycling", labelKey: "workModerate", examplesKey: "workModerateExamples" },
  { key: "heavy", label: "Heavy", examples: "digging, shovelling, loading by hand, running", labelKey: "workHeavy", examplesKey: "workHeavyExamples" },
];

export interface Regimen {
  /** Minutes of work allowed per hour; the rest of the hour is rest in shade. */
  workMin: 60 | 45 | 30 | 15 | 0;
  /** English label (also used in AI prompts); show `key` through t() in the UI. */
  label: string;
  key: Key;
  color: string;
}

export const REGIMENS: Regimen[] = [
  { workMin: 60, label: "Safe to work normally", key: "regimen60", color: "#22c55e" },
  { workMin: 45, label: "45 min work, 15 min rest each hour", key: "regimen45", color: "#eab308" },
  { workMin: 30, label: "30 min work, 30 min rest each hour", key: "regimen30", color: "#f97316" },
  { workMin: 15, label: "15 min work, 45 min rest each hour", key: "regimen15", color: "#ef4444" },
  { workMin: 0, label: "Stop outdoor work", key: "regimen0", color: "#991b1b" },
];

/**
 * Highest WBGT (°C) at which each regimen above still applies — the ACGIH work/rest screening
 * values as tabulated in the OSHA Technical Manual (permissible heat exposure TLVs).
 * They assume heat-acclimatised, healthy adults in normal work clothing with water available.
 * Heavier clothing and unacclimatised workers are handled by raising the WBGT first (effectiveWbgt).
 * Fully enclosed vapour-barrier suits are outside these tables: they need physiological monitoring.
 */
const LIMITS: Record<Intensity, [number, number, number, number]> = {
  light: [30.0, 30.6, 31.4, 32.2],
  moderate: [26.7, 28.0, 29.4, 31.1],
  heavy: [25.0, 25.9, 27.9, 30.0],
};

export type Clothing = "normal" | "coveralls" | "double";

/** ACGIH clothing adjustment values (°C added to WBGT). */
export const CLOTHING: { key: Clothing; label: string; adjust: number; note: string }[] = [
  { key: "normal", label: "Normal work clothes", adjust: 0, note: "Cotton shirt and trousers" },
  { key: "coveralls", label: "Coveralls", adjust: 1, note: "Single-layer polyolefin coveralls" },
  { key: "double", label: "Double layer / heavy PPE", adjust: 3, note: "Double-layer woven clothing, fire-retardant gear" },
];

/**
 * Unacclimatised workers (first ~2 weeks in the heat, or back from leave or illness) tolerate less heat.
 * ACGIH's action limit for them sits roughly 2–3 °C below the acclimatised limit.
 */
export const UNACCLIMATISED_ADJUST = 2.5;

export interface WorkerContext {
  clothing: Clothing;
  acclimatised: boolean;
}
export const DEFAULT_CONTEXT: WorkerContext = { clothing: "normal", acclimatised: true };

/** Effective WBGT: the clothing adjustment, plus a margin for unacclimatised workers. */
export function effectiveWbgt(wbgt: number, ctx: WorkerContext = DEFAULT_CONTEXT) {
  const c = CLOTHING.find((x) => x.key === ctx.clothing)?.adjust ?? 0;
  return wbgt + c + (ctx.acclimatised ? 0 : UNACCLIMATISED_ADJUST);
}

/** Short description of a crew context, for notices and reports. */
export function contextLabel(ctx: WorkerContext = DEFAULT_CONTEXT) {
  const c = CLOTHING.find((x) => x.key === ctx.clothing)?.label ?? "Normal work clothes";
  return `${c}, ${ctx.acclimatised ? "acclimatised crew" : "crew new to the heat"}`;
}

export function workRegimen(wbgt: number, intensity: Intensity, ctx?: WorkerContext): Regimen {
  const w = effectiveWbgt(wbgt, ctx);
  const i = LIMITS[intensity].findIndex((limit) => w <= limit);
  return REGIMENS[i === -1 ? REGIMENS.length - 1 : i];
}

/**
 * Water to drink per hour (litres). CDC/NIOSH advise about one cup (~250 ml) every 15–20 minutes
 * in the heat, and no more than about 1.5 L an hour (too much water is dangerous too).
 */
export const litresPerHour = (r: Regimen) => (r.workMin === 60 ? 0.5 : r.workMin === 45 ? 0.75 : 1);

/** What to do if a worker shows signs of heat stroke. Shown with every Red and Black flag. */
export const HEAT_ESCALATION =
  "Stop work, move to shade, cool with water, and call emergency services if the worker is confused, stops sweating, collapses or has a temperature above 40 °C.";

/**
 * Worksite flag colours (military/sports heat-flag convention): green, yellow, red, black.
 * `key` and `textKey` are the lib/i18n keys; Red and Black carry the clinical escalation path.
 */
export function heatFlag(r: Regimen) {
  if (r.workMin === 60) return { key: "flagGreen", textKey: "flagGreenText", name: "Green flag", color: "#16a34a", text: "Normal work. Keep water available.", escalate: null } as const;
  if (r.workMin === 45) return { key: "flagYellow", textKey: "flagYellowText", name: "Yellow flag", color: "#ca8a04", text: "Caution. Scheduled rest breaks every hour.", escalate: null } as const;
  if (r.workMin > 0) return { key: "flagRed", textKey: "flagRedText", name: "Red flag", color: "#dc2626", text: "Danger. Long rest breaks; heavy work only in the cooler hours.", escalate: HEAT_ESCALATION } as const;
  return { key: "flagBlack", textKey: "flagBlackText", name: "Black flag", color: "#0a0a0a", text: "Extreme danger. Stop outdoor work.", escalate: HEAT_ESCALATION } as const;
}

export interface HourRange {
  /** "HH:00" start of the first hour, and end of the last hour ("24:00" for midnight). */
  from: string;
  to: string;
  hours: number;
}

/** Collapse consecutive hours matching `match` into ranges. `hours` is one day, in order. */
export function hourRanges<T extends { time: string }>(hours: T[], match: (h: T) => boolean): HourRange[] {
  const ranges: HourRange[] = [];
  let open: HourRange | null = null;
  for (const h of hours) {
    const start = Number(h.time.slice(11, 13));
    const end = `${String(start + 1).padStart(2, "0")}:00`;
    if (!match(h)) {
      open = null;
    } else if (open) {
      open.to = end;
      open.hours++;
    } else {
      open = { from: h.time.slice(11, 16), to: end, hours: 1 };
      ranges.push(open);
    }
  }
  return ranges;
}
