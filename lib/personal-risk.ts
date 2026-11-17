// Personal heat + air risk screening. Deterministic and instant. HeatSignal's own heuristic for
// awareness, not a medical assessment: the point values are design choices informed by WHO/CDC
// lists of who is most at risk from heat and air pollution.

export type AgeGroup = "under5" | "5-17" | "18-40" | "41-64" | "65+";
export type Activity = "indoor" | "outdoor" | "student" | "athlete" | "elderly" | "tourist";
export type Outdoors = "0-1" | "1-3" | "3-6" | "6+";
export type Condition = "respiratory" | "heart" | "diabetes" | "kidney" | "obesity" | "pregnant" | "medication";
export type Access = "yes" | "limited" | "no";
export type Sun = "yes" | "partially" | "no";

export interface Profile {
  age: AgeGroup;
  activity: Activity;
  outdoors: Outdoors;
  conditions: Condition[];
  ac: Access;
  water: Access;
  sun: Sun;
}

/** Today's peak environmental conditions at the person's location. */
export interface Env {
  wbgt: number;
  aqi: number | null;
  uv: number | null;
  /** Compound score 0–100, or null without air data. */
  score: number | null;
}

const AGE = { under5: 12, "5-17": 5, "18-40": 0, "41-64": 4, "65+": 12 } as const;
const ACTIVITY = { indoor: 0, elderly: 2, student: 4, tourist: 6, athlete: 10, outdoor: 12 } as const;
export const OUTDOOR_HOURS = { "0-1": 0.5, "1-3": 2, "3-6": 4.5, "6+": 7 } as const;
const OUTDOOR = { "0-1": 0, "1-3": 3, "3-6": 6, "6+": 10 } as const;
const CONDITION = { respiratory: 6, heart: 8, diabetes: 4, kidney: 5, obesity: 4, pregnant: 6, medication: 5 } as const;
const AC = { yes: -8, limited: -3, no: 5 } as const;
const WATER = { yes: -3, limited: 2, no: 6 } as const;
const SUN = { yes: 5, partially: 2, no: -3 } as const;

export const LEVELS = [
  { max: 19, label: "Low", color: "#22c55e" },
  { max: 39, label: "Elevated", color: "#eab308" },
  { max: 59, label: "High", color: "#f97316" },
  { max: 79, label: "Very High", color: "#ef4444" },
  { max: 100, label: "Critical", color: "#a855f7" },
] as const;

export interface PersonalRisk {
  score: number;
  level: (typeof LEVELS)[number];
  /** Points from each factor; "protective" can be negative (it lowers risk). */
  parts: { environment: number; age: number; activity: number; health: number; protective: number };
  litres: number;
  advice: string[];
}

/** Litres of water to drink today (formula from the HeatSignal spec). */
export function hydrationLitres(wbgt: number, outdoorHours: number, activity: Activity): number {
  let base = 2.0;
  if (wbgt > 28) base += 0.5;
  if (wbgt > 32) base += 1.0;
  if (outdoorHours > 3) base += (0.5 * (outdoorHours - 3)) / 3;
  if (activity === "athlete" || activity === "outdoor") base += 1.0;
  return Math.round(base * 10) / 10;
}

/** Environment as 0–50 points: the compound score, or heat alone (WBGT 20→0, 35→50) without air data. */
const envPoints = (e: Env) =>
  e.score != null ? e.score / 2 : Math.min(Math.max(((e.wbgt - 20) / 15) * 50, 0), 50);

export function assess(p: Profile, e: Env): PersonalRisk {
  const badAir = (e.aqi ?? 0) > 100;
  const health = Math.min(
    25,
    p.conditions.reduce((s, c) => s + CONDITION[c] * (c === "respiratory" && badAir ? 1.5 : 1), 0),
  );
  const parts = {
    environment: Math.round(envPoints(e)),
    age: AGE[p.age],
    activity: ACTIVITY[p.activity] + OUTDOOR[p.outdoors],
    health: Math.round(health),
    protective: AC[p.ac] + WATER[p.water] + SUN[p.sun],
  };
  const score = Math.min(100, Math.max(0, Object.values(parts).reduce((a, b) => a + b, 0)));
  const level = LEVELS.find((l) => score <= l.max)!;
  const hours = OUTDOOR_HOURS[p.outdoors];
  const litres = hydrationLitres(e.wbgt, hours, p.activity);
  const has = (c: Condition) => p.conditions.includes(c);
  const elevated = score >= 20;

  const advice: string[] = [];
  if (p.activity === "outdoor" && e.wbgt > 28) advice.push("Take a 15-minute shade break every 45 minutes while working outdoors.");
  if (has("respiratory") && badAir) advice.push("Wear an N95 mask outdoors and carry your inhaler.");
  if ((p.age === "65+" || p.activity === "elderly") && (e.score ?? 0) > 50) advice.push("Stay indoors between 11am and 3pm and keep curtains closed on the sunny side.");
  if (has("pregnant") && elevated) advice.push("Talk to your doctor about safe limits for outdoor activity in this heat.");
  if (p.ac !== "yes" && e.wbgt > 28) advice.push("Spend the hottest hours in an air-conditioned public space such as a mall, library or mosque.");
  if (has("heart") && e.wbgt > 28) advice.push("Avoid exertion in the afternoon heat; seek care at once for chest pain or breathlessness.");
  if (has("diabetes") || has("kidney") || has("medication")) advice.push("Ask your doctor whether your medicines change how much you should drink or how well you handle heat.");
  if (p.age === "under5" || p.age === "5-17") advice.push("Keep children in the shade at midday, dress them lightly and offer water often.");
  if (p.activity === "athlete" && e.wbgt > 26) advice.push("Train early in the morning or after sunset, and cut intensity when WBGT is above 28 °C.");
  if (p.water !== "yes") advice.push("Carry water with you today and know where you can refill it.");
  if (badAir && !has("respiratory")) advice.push("Air quality is poor: limit hard outdoor exertion and keep windows closed.");
  if ((e.uv ?? 0) >= 6) advice.push("UV is high: wear a hat and sunglasses and use SPF 30+ sunscreen.");
  if (p.sun === "yes" && e.wbgt > 26) advice.push("Shift time in direct sun to the early morning or evening where you can.");
  // Always give at least five: general protective habits fill the rest.
  const general = [
    "Conditions are manageable today: keep drinking water and rest in shade if you feel unwell.",
    "Wear light-coloured, loose clothing and a hat outdoors.",
    p.activity === "outdoor" ? "Plan the heaviest tasks for the early morning." : "Plan outdoor errands for the early morning or evening.",
    "Know the warning signs — dizziness, headache, nausea, confusion — and stop and cool down if they appear.",
    "Check on older relatives and neighbours who live alone.",
  ];
  for (const g of general) if (advice.length < 5) advice.push(g);

  return { score, level, parts, litres, advice: advice.slice(0, 7) };
}
