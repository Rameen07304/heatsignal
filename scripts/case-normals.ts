// Precomputes the "normal" daily max WBGT for each heat case study, so the page doesn't make
// five archive requests per case for numbers that never change.
// Run: node scripts/case-normals.ts   (writes lib/case-normals.json)
import { writeFileSync } from "node:fs";
import { wbgt } from "../lib/wbgt.ts";

const CASES = [
  { id: "karachi-2015", lat: 24.86, lon: 67.01, start: "2015-06-10", end: "2015-06-30" },
  { id: "sindh-2024", lat: 28.28, lon: 68.45, start: "2024-05-15", end: "2024-06-05" },
];
const YEARS = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dailyMax(lat: number, lon: number, start: string, end: string) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&hourly=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${start}`);
  const { hourly: h } = await res.json();
  const out: Record<string, number> = {};
  h.time.forEach((t: string, i: number) => {
    const T = h.temperature_2m[i];
    const rh = h.relative_humidity_2m[i];
    if (T == null || rh == null) return;
    const w = wbgt(T, rh, h.shortwave_radiation[i] ?? undefined);
    out[t.slice(5, 10)] = Math.max(out[t.slice(5, 10)] ?? -Infinity, w);
  });
  return out;
}

const result: Record<string, Record<string, number>> = {};
for (const c of CASES) {
  const year = Number(c.start.slice(0, 4));
  const sums: Record<string, number[]> = {};
  for (let k = 1; k <= YEARS; k++) {
    const y = year - k;
    const days = await dailyMax(c.lat, c.lon, `${y}${c.start.slice(4)}`, `${y}${c.end.slice(4)}`);
    for (const [d, v] of Object.entries(days)) (sums[d] ??= []).push(v);
    await sleep(500); // be gentle with the free API
  }
  result[c.id] = Object.fromEntries(
    Object.entries(sums).map(([d, xs]) => [d, Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100]),
  );
  console.log(c.id, Object.keys(result[c.id]).length, "days");
}

writeFileSync(
  new URL("../lib/case-normals.json", import.meta.url),
  JSON.stringify({ years: YEARS, note: "Mean daily max WBGT by MM-DD over the previous years; see scripts/case-normals.ts", ...result }, null, 2) + "\n",
);
