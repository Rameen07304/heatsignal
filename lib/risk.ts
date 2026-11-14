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
