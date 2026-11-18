export type RiskLevel = "Low" | "Moderate" | "High" | "Extreme";

/** Lower WBGT bound (°C) of each level, ascending. */
export const RISK_BANDS: { level: RiskLevel; min: number; color: string }[] = [
  { level: "Low", min: -Infinity, color: "#22c55e" },
  { level: "Moderate", min: 27, color: "#eab308" },
  { level: "High", min: 30, color: "#f97316" },
  { level: "Extreme", min: 33, color: "#ef4444" },
];

export const RISK_COLORS = Object.fromEntries(
  RISK_BANDS.map((b) => [b.level, b.color]),
) as Record<RiskLevel, string>;

export function classifyRisk(wbgt: number): RiskLevel {
  let level: RiskLevel = "Low";
  for (const band of RISK_BANDS) if (wbgt >= band.min) level = band.level;
  return level;
}

export const isElevated = (level: RiskLevel) =>
  level === "High" || level === "Extreme";

// ---------------------------------------------------------------------------------------------
// Compound Environmental Health Risk Score — heat stress, air quality and UV in one 0–100 number.
// This is HeatSignal's own index, not a clinical standard: the weights are a design choice, and
// the "compound penalty" encodes the finding that heat and air pollution together are worse than
// either alone. The thresholds of the inputs (WBGT, US AQI, UV index) are the standard ones.
// ---------------------------------------------------------------------------------------------

export type CompoundLevel = "Low" | "Moderate" | "High" | "Critical" | "Emergency";

export const COMPOUND_BANDS: { level: CompoundLevel; max: number; color: string; description: string }[] = [
  { level: "Low", max: 25, color: "#22c55e", description: "Safe for normal outdoor activity" },
  { level: "Moderate", max: 50, color: "#eab308", description: "Fine for most. Children, older and sick people take breaks" },
  { level: "High", max: 75, color: "#f97316", description: "Cut outdoor time, rest in shade, drink extra water" },
  { level: "Critical", max: 90, color: "#ef4444", description: "Dangerous. Keep outdoor work short, with long breaks" },
  { level: "Emergency", max: 100, color: "#991b1b", description: "Life-threatening. Stay indoors" },
];

export function compoundRiskScore(wbgt: number, aqi: number, uv: number): number {
  // Normalise each to 0–1
  const heatNorm = Math.min(Math.max(wbgt, 0) / 40, 1); // 40 °C WBGT = max
  const aqiNorm = Math.min(Math.max(aqi, 0) / 300, 1); // 300 AQI = max
  const uvNorm = Math.min(Math.max(uv, 0) / 11, 1); // 11+ UV = extreme

  // Weighted combination
  const base = heatNorm * 0.45 + aqiNorm * 0.4 + uvNorm * 0.15;

  // Compound multiplier: when BOTH heat AND air quality are bad, risk jumps (up to 1.5×)
  const compoundPenalty = heatNorm > 0.5 && aqiNorm > 0.4 ? 1.0 + heatNorm * aqiNorm * 0.5 : 1.0;

  return Math.min(Math.round(base * compoundPenalty * 100), 100);
}

/** True when the compound penalty is active — i.e. heat and bad air are hitting together. */
export const isCompoundEvent = (wbgt: number, aqi: number) => wbgt / 40 > 0.5 && aqi / 300 > 0.4;

export const compoundBand = (score: number) =>
  COMPOUND_BANDS.find((b) => score <= b.max) ?? COMPOUND_BANDS[COMPOUND_BANDS.length - 1];

// ---------------------------------------------------------------------------------------------
// UV index — WHO categories.
// ---------------------------------------------------------------------------------------------

export const UV_BANDS = [
  { max: 2, label: "Low", color: "#22c55e" },
  { max: 5, label: "Moderate", color: "#eab308" },
  { max: 7, label: "High", color: "#f97316" },
  { max: 10, label: "Very high", color: "#ef4444" },
  { max: Infinity, label: "Extreme", color: "#a855f7" },
] as const;

export const uvBand = (uv: number) => UV_BANDS.find((b) => uv <= b.max + 0.5) ?? UV_BANDS[4];
