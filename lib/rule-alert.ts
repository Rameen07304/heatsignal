import { aqiBand, formatAqi } from "./air";
import type { AlertInput, AlertText } from "./alert-types";
import { isCompoundEvent, uvBand } from "./risk";
import { workRegimen } from "./work-rest";

/**
 * HeatSignal's built-in alert, written from fixed rules. Used when the AI service is unavailable,
 * so a warning always goes out. English only.
 */
export function ruleAlert(i: AlertInput): AlertText {
  const regimen = workRegimen(i.wbgt, "moderate");
  const heavy = workRegimen(i.wbgt, "heavy");
  const band = i.air ? aqiBand(i.air.aqi) : null;
  const badAir = i.air != null && i.air.aqi > 100;
  const veryBadAir = i.air != null && i.air.aqi > 150;
  const highUv = i.air != null && i.air.uv >= 6;
  const compound = i.air != null && isCompoundEvent(i.wbgt, i.air.aqi);

  const parts = [
    `${i.city} is at ${i.heatRisk.toLowerCase()} heat risk: WBGT ${i.wbgt.toFixed(1)} °C with an air temperature of ${i.temperature.toFixed(1)} °C and ${i.humidity.toFixed(0)} % humidity.`,
  ];
  if (i.air && band) {
    parts.push(`Air quality is ${band.label.toLowerCase()} (US AQI ${formatAqi(i.air.aqi)}, PM2.5 ${i.air.pm25.toFixed(0)} µg/m³).`);
  }
  if (compound) parts.push("Heat and polluted air are occurring together, which strains the heart and lungs more than either alone.");
  if (i.score != null && i.level) parts.push(`Compound risk score: ${i.score}/100 (${i.level}).`);

  const groups = ["Outdoor workers", "Older adults (65+)"];
  if (i.heatRisk !== "Low" || (i.score ?? 0) > 50) groups.push("Young children", "Pregnant women");
  if (badAir) groups.push("People with asthma, COPD or other lung conditions");
  if (i.heatRisk === "High" || i.heatRisk === "Extreme" || compound) groups.push("People with heart disease");

  const actions: string[] = [];
  if (i.heatRisk !== "Low") {
    actions.push("Drink water regularly — about one cup every 15–20 minutes when active outdoors — even if not thirsty.");
    actions.push("Stay in shade or air-conditioned spaces during the hottest hours, usually 11:00–16:00.");
    actions.push("Check on older neighbours and relatives at least twice a day.");
  } else {
    actions.push("Heat stress is low; normal outdoor activity is fine with ordinary hydration.");
  }
  if (badAir) actions.push("Wear a well-fitted N95 mask outdoors and keep windows closed while air quality is poor.");
  if (veryBadAir) actions.push("Move exercise and children's outdoor play indoors until the air improves.");
  if (highUv) actions.push(`UV is ${uvBand(i.air!.uv).label.toLowerCase()} (${i.air!.uv.toFixed(0)}): wear a hat and sunglasses and use SPF 30+ sunscreen.`);
  // Trim the others, never this one: the worst conditions produce the most actions.
  actions.splice(5);
  actions.push("Seek urgent care for confusion, fainting, hot dry skin or difficulty breathing.");

  const worker = [
    `Moderate work (e.g. carrying loads): ${regimen.label.toLowerCase()}. Heavy work (e.g. digging): ${heavy.label.toLowerCase()}.`,
    regimen.workMin < 60
      ? "Provide shaded rest areas and cool water at the work site; rest breaks must be taken, not skipped."
      : "No heat-related limits on work hours right now; keep water available.",
  ];
  if (veryBadAir) worker.push("Issue N95 masks to everyone working outdoors and reduce heavy exertion.");
  worker.push("Use a buddy system so workers can spot signs of heat illness in each other.");

  return { risk_assessment: parts.join(" "), vulnerable_groups: groups, actions, worker_safety: worker };
}
