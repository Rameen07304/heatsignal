import type { CombinedHour } from "./conditions";

/** 0 = all clear, 1 = modified, 2 = restricted, 3 = cancel/postpone. */
export type Status = 0 | 1 | 2 | 3;

/** Thresholds from the HeatSignal school/event spec. */
export function hourStatus(h: CombinedHour): Status {
  const s = h.score ?? 0;
  const a = h.air?.aqi ?? 0;
  if (s >= 70 || h.wbgt >= 32 || a >= 200) return 3;
  if (s >= 50 || h.wbgt >= 30 || a >= 150) return 2;
  if (s >= 35 || h.wbgt >= 28 || a >= 100) return 1;
  return 0;
}

export const worstStatus = (hours: CombinedHour[]) => Math.max(0, ...hours.map(hourStatus)) as Status;

export const STATUS_COLOR = ["#16a34a", "#ca8a04", "#ea580c", "#dc2626"] as const;

export const SCHOOL = [
  { icon: "🟢", name: "ALL CLEAR", text: "Normal outdoor activities.", hour: "Safe for outdoor PE" },
  { icon: "🟡", name: "MODIFIED", text: "Limit outdoor activity to 30 minutes, with water available.", hour: "Short outdoor time, with water" },
  { icon: "🟠", name: "RESTRICTED", text: "Indoor activities only between 10am and 2pm; brief outdoor time before or after is OK.", hour: "Indoor only" },
  { icon: "🔴", name: "CANCELLED", text: "All outdoor activities cancelled today.", hour: "Minimise all outdoor time" },
] as const;

export const EVENT = ["Safe", "Caution", "High Risk", "Postpone Recommended"] as const;

/** Why an hour has its status, in a few words. */
export function hourReason(h: CombinedHour): string {
  const parts = [`WBGT ${h.wbgt.toFixed(1)} °C`];
  if (h.air) parts.push(`AQI ${Math.round(h.air.aqi)}`);
  if (h.score != null) parts.push(`compound ${h.score}`);
  return parts.join(" · ");
}
