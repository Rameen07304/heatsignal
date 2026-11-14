export type Intensity = "light" | "moderate" | "heavy";

export const INTENSITIES: { key: Intensity; label: string; examples: string }[] = [
  { key: "light", label: "Light", examples: "walking, shopping, supervising, driving" },
  { key: "moderate", label: "Moderate", examples: "farming, bricklaying, carrying loads, cycling" },
  { key: "heavy", label: "Heavy", examples: "digging, shovelling, loading by hand, running" },
];

export interface Regimen {
  /** Minutes of work allowed per hour; the rest of the hour is rest in shade. */
  workMin: 60 | 45 | 30 | 15 | 0;
  label: string;
  color: string;
}

export const REGIMENS: Regimen[] = [
  { workMin: 60, label: "Safe to work normally", color: "#22c55e" },
  { workMin: 45, label: "45 min work, 15 min rest each hour", color: "#eab308" },
  { workMin: 30, label: "30 min work, 30 min rest each hour", color: "#f97316" },
  { workMin: 15, label: "15 min work, 45 min rest each hour", color: "#ef4444" },
  { workMin: 0, label: "Stop outdoor work", color: "#991b1b" },
];

/**
 * Highest WBGT (°C) at which each regimen above still applies — the ACGIH work/rest screening
 * values as tabulated in the OSHA Technical Manual (permissible heat exposure TLVs).
 * They assume heat-acclimatised, healthy adults in normal work clothing with water available.
 */
const LIMITS: Record<Intensity, [number, number, number, number]> = {
  light: [30.0, 30.6, 31.4, 32.2],
  moderate: [26.7, 28.0, 29.4, 31.1],
  heavy: [25.0, 25.9, 27.9, 30.0],
};

export function workRegimen(wbgt: number, intensity: Intensity): Regimen {
  const i = LIMITS[intensity].findIndex((limit) => wbgt <= limit);
  return REGIMENS[i === -1 ? REGIMENS.length - 1 : i];
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
