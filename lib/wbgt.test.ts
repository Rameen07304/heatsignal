// Self-check: `npm test` (Node 22.15+; scripts/ts-resolve.mjs lets plain Node load lib/ files).
import assert from "node:assert/strict";
import { wbgt, wetBulb } from "./wbgt.ts";
import { classifyRisk, compoundBand, compoundRiskScore } from "./risk.ts";
import { hourRanges, workRegimen } from "./work-rest.ts";
import { assess, hydrationLitres } from "./personal-risk.ts";
import { ruleAlert } from "./rule-alert.ts";
import { upcomingRisk } from "./risk-forecast.ts";
import { trendYears } from "./trends.ts";
import type { CombinedHour, Conditions } from "./conditions.ts";
import { dayProfile, healthScores, recommendations } from "./health-advisor.ts";

// 30°C / 50% RH: e = 0.5 * 6.105 * exp(17.27*30/267.7) ≈ 21.14 hPa → WBGT ≈ 29.26
assert.ok(Math.abs(wbgt(30, 50) - 29.26) < 0.05, `wbgt(30,50)=${wbgt(30, 50)}`);
assert.ok(wbgt(40, 60) > wbgt(40, 20), "humidity must raise WBGT");

// Stull's own worked example: 20 °C at 50 % RH → wet bulb 13.7 °C.
assert.ok(Math.abs(wetBulb(20, 50) - 13.7) < 0.1, `wetBulb(20,50)=${wetBulb(20, 50)}`);
// Sun-aware WBGT: full sun equals the BoM formula, night is the ISO shade value, dawn is between.
assert.equal(wbgt(27, 85, 800), wbgt(27, 85));
assert.ok(Math.abs(wbgt(27, 85, 0) - (0.7 * wetBulb(27, 85) + 0.3 * 27)) < 1e-9);
assert.ok(wbgt(27, 85, 0) < 27, "humid tropical night must not read as High risk");
assert.ok(wbgt(27, 85, 0) < wbgt(27, 85, 250) && wbgt(27, 85, 250) < wbgt(27, 85, 800));

assert.equal(classifyRisk(26.99), "Low");
assert.equal(classifyRisk(27), "Moderate");
assert.equal(classifyRisk(29.99), "Moderate");
assert.equal(classifyRisk(30), "High");
assert.equal(classifyRisk(32.99), "High");
assert.equal(classifyRisk(33), "Extreme");
assert.equal(classifyRisk(-5), "Low");

// Compound score: worked by hand from the formula.
// WBGT 30, AQI 86, UV 8 → base .3375 + .1147 + .1091 = .5613; AQI too low for the penalty → 56.
assert.equal(compoundRiskScore(30, 86, 8), 56);
// WBGT 33, AQI 137, UV 10 → base .3713 + .1827 + .1364 = .6903; penalty 1 + .825 × .4567 × .5 = 1.1884 → 82.
assert.equal(compoundRiskScore(33, 137, 10), 82);
assert.equal(compoundRiskScore(0, 0, 0), 0);
assert.equal(compoundRiskScore(60, 900, 20), 100, "capped at 100");
assert.ok(compoundRiskScore(32, 200, 5) > compoundRiskScore(32, 0, 5) + compoundRiskScore(0, 200, 0) - 1,
  "heat + bad air together scores at least the sum of the parts");
assert.equal(compoundBand(25).level, "Low");
assert.equal(compoundBand(26).level, "Moderate");
assert.equal(compoundBand(76).level, "Critical");
assert.equal(compoundBand(91).level, "Emergency");

// Work/rest limits: boundaries are inclusive, heavier work is restricted sooner.
assert.equal(workRegimen(26.7, "moderate").workMin, 60);
assert.equal(workRegimen(26.8, "moderate").workMin, 45);
assert.equal(workRegimen(26.8, "light").workMin, 60);
assert.equal(workRegimen(26.8, "heavy").workMin, 30);
assert.equal(workRegimen(31.1, "moderate").workMin, 15);
assert.equal(workRegimen(31.2, "moderate").workMin, 0);
assert.equal(workRegimen(40, "light").workMin, 0);

const day = [5, 6, 7, 12, 13, 23].map((h) => ({ time: `2026-06-01T${String(h).padStart(2, "0")}:00` }));
assert.deepEqual(
  hourRanges(day, () => true),
  // Adjacency in the array is taken as adjacency in time: callers pass a full 24-hour day.
  [{ from: "05:00", to: "24:00", hours: 6 }],
);
assert.deepEqual(
  hourRanges(day, (h) => h.time < "2026-06-01T08:00" || h.time > "2026-06-01T20:00"),
  [
    { from: "05:00", to: "08:00", hours: 3 },
    { from: "23:00", to: "24:00", hours: 1 },
  ],
);

// Hydration formula: base 2 L, +0.5 above WBGT 28, +1 above 32, +0.5 per 3 h beyond 3 h outdoors, +1 for workers/athletes.
assert.equal(hydrationLitres(25, 0.5, "indoor"), 2);
assert.equal(hydrationLitres(30, 0.5, "indoor"), 2.5);
assert.equal(hydrationLitres(33, 7, "outdoor"), 5.2); // 2 + 0.5 + 1 + 0.67 + 1 = 5.17
// Personal risk: clamped to 0–100, and a vulnerable person scores higher than a protected one.
const env = { wbgt: 31, aqi: 160, uv: 9, score: 80 };
const safe = assess({ age: "18-40", activity: "indoor", outdoors: "0-1", conditions: [], ac: "yes", water: "yes", sun: "no" }, env);
const risky = assess({ age: "65+", activity: "outdoor", outdoors: "6+", conditions: ["heart", "respiratory"], ac: "no", water: "no", sun: "yes" }, env);
assert.ok(risky.score > safe.score && risky.score <= 100 && safe.score >= 0);
assert.equal(risky.level.label, "Critical");
assert.ok(risky.advice.some((a) => a.includes("N95")), "respiratory + bad air advises a mask");

// Rule-based alert: in the worst conditions (most actions) "seek urgent care" must survive the trim.
const worst = ruleAlert({
  city: "Jacobabad", lat: 28.3, lon: 68.4, temperature: 46, humidity: 35, wbgt: 34, heatRisk: "Extreme",
  air: { aqi: 220, pm25: 120, uv: 10 }, score: 92, level: "Emergency",
});
assert.ok(worst.actions.length <= 6, `${worst.actions.length} actions`);
assert.ok(worst.actions.at(-1)!.startsWith("Seek urgent care"), "urgent-care advice is never dropped");

// 48-hour early warning: a city that peaks at 40 today and reaches 80 in ten hours is flagged Critical.
const hours = Array.from({ length: 49 }, (_, i) => ({ time: `h${i}`, score: i === 10 ? 80 : 30, level: i === 10 ? "Critical" : "Moderate" }));
const conds = { hours, now: hours[0], days: [{ maxScore: 40 }] } as unknown as Conditions;
assert.deepEqual(
  { severity: upcomingRisk(conds)?.severity, hoursUntil: upcomingRisk(conds)?.hoursUntil },
  { severity: "critical", hoursUntil: 10 },
);
// Already Critical earlier today: no "new" warning.
assert.equal(upcomingRisk({ ...conds, days: [{ maxScore: 85 }] } as unknown as Conditions), null);

// Trend years: the last five finished summers, by hemisphere.
const north = { name: "", country: "", lat: 25, lon: 0 };
const south = { ...north, lat: -25 };
assert.deepEqual(trendYears(north, new Date("2026-11-18")), [2022, 2023, 2024, 2025, 2026]);
assert.deepEqual(trendYears(north, new Date("2026-07-01")), [2021, 2022, 2023, 2024, 2025]);
assert.deepEqual(trendYears(south, new Date("2026-02-15")), [2021, 2022, 2023, 2024, 2025]);
assert.deepEqual(trendYears(south, new Date("2026-04-01")), [2022, 2023, 2024, 2025, 2026]);

// Health advisor: a dim, smoggy winter day needs vitamin D and lung protection; a hot sunny one needs salts and SPF.
const mk = (date: string, f: (h: number) => { temp: number; uv: number; aqi: number; pm25: number }) =>
  Array.from({ length: 24 }, (_, h) => {
    const x = f(h);
    return {
      time: `${date}T${String(h).padStart(2, "0")}:00`, temp: x.temp, rh: 50, wind: 0, solar: 0, wbgt: wbgt(x.temp, 50), risk: "Low",
      air: { time: "", aqi: x.aqi, pm25: x.pm25, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, dust: 0, uv: x.uv },
      score: null, level: null,
    };
  }) as unknown as CombinedHour[];
const smog = dayProfile(mk("2026-12-01", () => ({ temp: 12, uv: 1, aqi: 220, pm25: 150 })), "2026-12-01", 31.5);
assert.equal(smog.sun?.risk, "very_high");
assert.equal(smog.sun?.uvHours, 0);
const smogRecs = recommendations(smog, "Lahore");
assert.deepEqual(smogRecs.filter((r) => r.priority === "essential").map((r) => r.id).sort(), ["respiratory", "vit-d"]);
assert.ok(!smogRecs.some((r) => r.id === "sunscreen" || r.id === "electrolytes"));
const hot = dayProfile(mk("2026-06-01", (h) => ({ temp: h >= 10 && h <= 16 ? 42 : 30, uv: h >= 10 && h <= 15 ? 11 : 2, aqi: 60, pm25: 10 })), "2026-06-01", 25);
assert.equal(hot.skin?.spf, 50);
assert.equal(hot.sun?.uvHours, 6); // 10:00–15:00 inside the 08–17 window
const hotRecs = recommendations(hot, "Dubai");
assert.equal(hotRecs[0].priority, "essential");
assert.ok(hotRecs.some((r) => r.id === "electrolytes") && hotRecs.some((r) => r.id === "sunscreen"));
assert.ok(!hotRecs.some((r) => r.id === "vit-d" || r.id === "respiratory"));
assert.equal(healthScores(hot).skin, 0);

console.log("wbgt, risk, compound, work/rest, personal-risk, rule-alert, early-warning, trend-year and health-advisor checks passed");
