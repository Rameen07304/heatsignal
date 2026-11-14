// Self-check: `npm test` (Node 22.18+ runs TypeScript directly).
import assert from "node:assert/strict";
import { wbgt } from "./wbgt.ts";
import { classifyRisk } from "./risk.ts";

// 30°C / 50% RH: e = 0.5 * 6.105 * exp(17.27*30/267.7) ≈ 21.14 hPa → WBGT ≈ 29.26
assert.ok(Math.abs(wbgt(30, 50) - 29.26) < 0.05, `wbgt(30,50)=${wbgt(30, 50)}`);
assert.ok(wbgt(40, 60) > wbgt(40, 20), "humidity must raise WBGT");

assert.equal(classifyRisk(26.99), "Low");
assert.equal(classifyRisk(27), "Moderate");
assert.equal(classifyRisk(29.99), "Moderate");
assert.equal(classifyRisk(30), "High");
assert.equal(classifyRisk(32.99), "High");
assert.equal(classifyRisk(33), "Extreme");
assert.equal(classifyRisk(-5), "Low");

console.log("wbgt + risk checks passed");
