import { aqiBand, formatAqi } from "./air";
import type { AlertInput, AlertText } from "./alert-types";
import { translate, type Key, type Lang, type Vars } from "./i18n/index";
import { isCompoundEvent, uvBand } from "./risk";
import { workRegimen } from "./work-rest";

const UV_KEY: Record<string, Key> = { Low: "low", Moderate: "moderate", High: "high", "Very high": "uvVeryHigh", Extreme: "extreme" };

/**
 * HeatSignal's built-in alert, written from fixed rules in any of the app's languages. Used when the AI
 * service is unavailable, so a warning always goes out.
 */
export function ruleAlert(i: AlertInput, lang: Lang = "en"): AlertText {
  const t = (key: Key, vars?: Vars) => translate(lang, key, vars);
  const lower = (key: Key) => t(key).toLocaleLowerCase(lang);
  const regimen = workRegimen(i.wbgt, "moderate");
  const heavy = workRegimen(i.wbgt, "heavy");
  const band = i.air ? aqiBand(i.air.aqi) : null;
  const badAir = i.air != null && i.air.aqi > 100;
  const veryBadAir = i.air != null && i.air.aqi > 150;
  const highUv = i.air != null && i.air.uv >= 6;
  const compound = i.air != null && isCompoundEvent(i.wbgt, i.air.aqi);

  const parts = [
    t("raHeat", {
      city: i.city,
      level: lower(i.heatRisk.toLowerCase() as Key),
      wbgt: i.wbgt.toFixed(1),
      temp: i.temperature.toFixed(1),
      rh: i.humidity.toFixed(0),
    }),
  ];
  if (i.air && band) parts.push(t("raAir", { band: lower(band.key as Key), aqi: formatAqi(i.air.aqi), pm25: i.air.pm25.toFixed(0) }));
  if (compound) parts.push(t("raCompound"));
  if (i.score != null && i.level) parts.push(t("raScore", { score: i.score, level: t(i.level.toLowerCase() as Key) }));

  const groups = [t("grpOutdoorWorkers"), t("grpOlder")];
  if (i.heatRisk !== "Low" || (i.score ?? 0) > 50) groups.push(t("grpChildren"), t("grpPregnant"));
  if (badAir) groups.push(t("grpLung"));
  if (i.heatRisk === "High" || i.heatRisk === "Extreme" || compound) groups.push(t("grpHeart"));

  const actions: string[] = [];
  if (i.heatRisk !== "Low") {
    actions.push(t("actWater"), t("actShade"), t("actNeighbours"));
  } else {
    actions.push(t("actLowHeat"));
  }
  if (badAir) actions.push(t("actMask"));
  if (veryBadAir) actions.push(t("actIndoorsPlay"));
  if (highUv) actions.push(t("actUv", { band: lower(UV_KEY[uvBand(i.air!.uv).label]), uv: i.air!.uv.toFixed(0) }));
  // Trim the others, never this one: the worst conditions produce the most actions.
  actions.splice(5);
  actions.push(t("actUrgentCare"));

  const worker = [
    t("wkRegimens", { moderate: lower(regimen.key), heavy: lower(heavy.key) }),
    regimen.workMin < 60 ? t("wkShadeWater") : t("wkNoLimits"),
  ];
  if (veryBadAir) worker.push(t("wkMasks"));
  worker.push(t("wkBuddy"));

  return { risk_assessment: parts.join(" "), vulnerable_groups: groups, actions, worker_safety: worker };
}
