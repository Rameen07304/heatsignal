import type { CombinedHour } from "./conditions";
import type { StatusMap } from "./device-store";
import { workRegimen, type Clothing, type Intensity } from "./work-rest";
import type { StatusLevel } from "./worker-status";

export interface Member {
  id: string;
  work: Intensity;
  clothing: Clothing;
  acclimatised: boolean;
}

const hhmm = (h: number, m = 0) => `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const hourOf = (h: CombinedHour) => Number(h.time.slice(11, 13));
export const regimenFor = (m: Member, wbgt: number, work: Intensity = m.work) => workRegimen(wbgt, work, { clothing: m.clothing, acclimatised: m.acclimatised });
const unfit = (s?: StatusLevel) => s === "stop" || s === "medical";

/**
 * When this member's next rest break starts. Within an hour, work comes first and rest at the end of the hour.
 * ponytail: uses the device's minutes; cities on half-hour time zones (e.g. India) are off by 30 min.
 */
export function nextBreak(m: Member, hours: CombinedHour[], minute: number): "stopped" | "now" | "none" | string {
  for (const [i, h] of hours.slice(0, 24).entries()) {
    const r = regimenFor(m, h.wbgt);
    if (i === 0) {
      if (r.workMin === 0) return "stopped";
      if (r.workMin < 60) return minute < r.workMin ? hhmm(hourOf(h), r.workMin) : "now";
    } else if (r.workMin < 60) {
      return hhmm(hourOf(h), r.workMin); // workMin 0: the stop starts on the hour
    }
  }
  return "none";
}

export type Cell = "heavy" | "lighter" | "rest";

/**
 * Rotation for the next `n` hours: as many heavy slots per hour as the crew has heavy tasks, given to whoever has
 * done the fewest consecutive heavy hours, and nobody does more than 2 heavy hours in a row while heavy work
 * needs breaks (yellow flag or worse). Members who must stop, and hours when heavy work must stop, get rest.
 */
export function rotation(members: Member[], hours: CombinedHour[], statuses: StatusMap, n = 4): Cell[][] {
  const slots = members.filter((m) => m.work === "heavy").length;
  const run = new Map(members.map((m) => [m.id, 0]));
  const total = new Map(members.map((m) => [m.id, 0]));
  return hours.slice(0, n).map((h) => {
    const restricted = members.some((m) => regimenFor(m, h.wbgt, "heavy").workMin < 60);
    const eligible = members
      .filter((m) => !unfit(statuses[m.id]?.level) && regimenFor(m, h.wbgt, "heavy").workMin > 0)
      .filter((m) => !restricted || run.get(m.id)! < 2)
      .sort((a, b) => run.get(a.id)! - run.get(b.id)! || total.get(a.id)! - total.get(b.id)! || (a.work === "heavy" ? -1 : 1));
    const heavy = new Set(eligible.slice(0, slots).map((m) => m.id));
    return members.map((m) => {
      const cell: Cell = unfit(statuses[m.id]?.level) ? "rest" : heavy.has(m.id) ? "heavy" : "lighter";
      run.set(m.id, cell === "heavy" ? run.get(m.id)! + 1 : 0);
      if (cell === "heavy") total.set(m.id, total.get(m.id)! + 1);
      return cell;
    });
  });
}
