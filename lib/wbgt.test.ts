// Self-check: `npm test` (Node 22.18+ runs TypeScript directly).
import assert from "node:assert/strict";
import { wbgt, wetBulb } from "./wbgt.ts";
import { classifyRisk } from "./risk.ts";
import { hourRanges, workRegimen } from "./work-rest.ts";

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
  // Hours 5-7 are consecutive in the list but 7→12 is not checked by clock time: the caller
  // passes a full 24-hour day, so adjacency in the array is adjacency in time.
  [{ from: "05:00", to: "24:00", hours: 6 }],
);
assert.deepEqual(
  hourRanges(day, (h) => h.time < "2026-06-01T08:00" || h.time > "2026-06-01T20:00"),
  [
    { from: "05:00", to: "08:00", hours: 3 },
    { from: "23:00", to: "24:00", hours: 1 },
  ],
);

console.log("wbgt, risk and work/rest checks passed");
