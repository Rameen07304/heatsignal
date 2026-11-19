import type { CombinedHour } from "./conditions";
import { hourRanges, litresPerHour, workRegimen, type HourRange, type Intensity, type Regimen, type WorkerContext } from "./work-rest";

export interface Industry {
  id: string;
  label: string;
  work: Intensity;
  description: string;
}

/** Typical work type for each industry's outdoor jobs. */
export const INDUSTRIES: Industry[] = [
  { id: "construction", label: "Construction", work: "heavy", description: "Building sites, road work, scaffolding" },
  { id: "agriculture", label: "Agriculture", work: "heavy", description: "Field work, harvesting, irrigation" },
  { id: "oil-gas", label: "Oil and gas", work: "heavy", description: "Rigs, pipelines, refinery maintenance" },
  { id: "sanitation", label: "Sanitation", work: "heavy", description: "Waste collection, street cleaning, sewers" },
  { id: "delivery", label: "Delivery and logistics", work: "moderate", description: "Riders, couriers, loading bays" },
  { id: "tourism", label: "Tourism and events", work: "moderate", description: "Guides, event staff, outdoor hospitality" },
  { id: "security", label: "Security and traffic", work: "light", description: "Gate duty, traffic police, patrols" },
];

/** Hours considered for outdoor work: 05:00 to 20:00. */
const DAY_START = 5;
const DAY_END = 20;
/** The usual day shift, 07:00 to 15:00. */
const SHIFT_START = 7;
const SHIFT_LEN = 8;

const hourOf = (h: { time: string }) => Number(h.time.slice(11, 13));

export interface WorkDay {
  /** The regimen at the hottest working hour. */
  worst: Regimen;
  peakWbgt: number;
  /** Hours (05–20) when continuous work is fine. */
  safeHours: number;
  safeWindows: HourRange[];
  /** Productive hours in a 07:00–15:00 shift, after required rest. */
  standardHours: number;
  /** The best 8-hour shift start (hour), and its productive hours. */
  bestStart: number;
  bestHours: number;
  /** Litres per worker over the 07:00–15:00 shift. */
  waterL: number;
  action: string;
}

const productive = (hours: CombinedHour[], from: number, work: Intensity, ctx?: WorkerContext) =>
  hours.filter((h) => hourOf(h) >= from && hourOf(h) < from + SHIFT_LEN).reduce((s, h) => s + workRegimen(h.wbgt, work, ctx).workMin / 60, 0);

/** One city's working day (`hours` = that day's 24 hours) for one type of work. Null if the day is incomplete. */
export function workDay(hours: CombinedHour[], work: Intensity, ctx?: WorkerContext): WorkDay | null {
  const day = hours.filter((h) => hourOf(h) >= DAY_START && hourOf(h) < DAY_END);
  if (day.length < DAY_END - DAY_START) return null;
  const peak = day.reduce((b, h) => (h.wbgt > b.wbgt ? h : b));
  const worst = workRegimen(peak.wbgt, work, ctx);
  const safe = (h: CombinedHour) => workRegimen(h.wbgt, work, ctx).workMin === 60;

  let bestStart = SHIFT_START;
  let bestHours = -1;
  for (let s = DAY_START; s + SHIFT_LEN <= DAY_END; s++) {
    const p = productive(day, s, work, ctx);
    if (p > bestHours) [bestStart, bestHours] = [s, p];
  }

  return {
    worst,
    peakWbgt: peak.wbgt,
    safeHours: day.filter(safe).length,
    safeWindows: hourRanges(day, safe),
    standardHours: productive(day, SHIFT_START, work, ctx),
    bestStart,
    bestHours,
    waterL: day.filter((h) => hourOf(h) >= SHIFT_START && hourOf(h) < SHIFT_START + SHIFT_LEN).reduce((s, h) => s + litresPerHour(workRegimen(h.wbgt, work, ctx)), 0),
    action:
      worst.workMin === 60
        ? "Normal schedule"
        : worst.workMin === 45
          ? "Hourly rest breaks"
          : worst.workMin > 0
            ? "Long breaks; move hard work to cooler hours"
            : "Stop work at the peak; split the shift",
  };
}

/** Paid hours lost to required rest across a workforce, for one 07:00–15:00 shift. */
export function productivityLoss(d: WorkDay, workers: number, hourlyWage: number) {
  const lostPerWorker = SHIFT_LEN - d.standardHours;
  const recovered = Math.max(0, d.bestHours - d.standardHours);
  return {
    productivePercent: Math.round((d.standardHours / SHIFT_LEN) * 100),
    lostPerWorker,
    lostTotal: lostPerWorker * workers,
    dailyCost: lostPerWorker * workers * hourlyWage,
    monthlyCost: lostPerWorker * workers * hourlyWage * 22,
    recoveredHours: recovered * workers,
    recoveredPercent: lostPerWorker > 0 ? Math.round((recovered / lostPerWorker) * 100) : 0,
  };
}

export const shiftLabel = (start: number) =>
  `${String(start).padStart(2, "0")}:00–${String(start + SHIFT_LEN).padStart(2, "0")}:00`;
