import type { Key } from "./i18n/en";
import { REGIMENS, type Regimen } from "./work-rest";

export const SYMPTOMS = ["headache", "dizziness", "nausea", "cramps", "heavySweating", "stoppedSweating", "confusion"] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export const RISK_FACTORS = ["previousIllness", "heartMeds", "recentIllness"] as const;
export type RiskFactor = (typeof RISK_FACTORS)[number];

/** One worker's optional, self-reported check-in. Everything is optional. */
export interface CheckIn {
  symptoms: Symptom[];
  /** Urine colour on the 1 (pale) – 8 (dark) chart. */
  urine?: number;
  /** Working heart rate, bpm. */
  hr?: number;
  /** Heart rate after 1 minute of rest, bpm. */
  recoveryHr?: number;
  age?: number;
  riskFactors: RiskFactor[];
  hoursInHeat?: number;
  /** Which day of a run of hot days today is (prior exposure; fatigue builds up). */
  hotDayStreak?: number;
}

export type StatusLevel = "ok" | "rest" | "stop" | "medical";
export interface Reason {
  key: Key;
  vars?: Record<string, number>;
}
export interface WorkerStatus {
  level: StatusLevel;
  reasons: Reason[];
  action: Key;
  /** The work–rest regimen to follow now (one step stricter than the site's when resting is advised). */
  regimen: Regimen;
}

export const STATUS_KEY: Record<StatusLevel, Key> = { ok: "statusOk", rest: "statusRest", stop: "statusStop", medical: "statusMedical" };
export const STATUS_COLOR: Record<StatusLevel, string> = { ok: "#16a34a", rest: "#ca8a04", stop: "#dc2626", medical: "#0a0a0a" };

const DEFAULT_AGE = 35;
/** NIOSH: heart rate still above 110 bpm one minute into rest is a sign of heat strain. */
const RECOVERY_HR_LIMIT = 110;

const stricter = (r: Regimen) => REGIMENS[Math.min(REGIMENS.indexOf(r) + 1, REGIMENS.length - 1)];

/** Turn a check-in into one status and one action. `regimen` is the site's current work–rest regimen for this worker. */
export function workerStatus(input: CheckIn, regimen: Regimen): WorkerStatus {
  const s = new Set(input.symptoms);
  const maxHr = 180 - (input.age ?? DEFAULT_AGE);

  const medical: Reason[] = [];
  if (s.has("confusion")) medical.push({ key: "reasonConfusion" });
  if (s.has("stoppedSweating")) medical.push({ key: "reasonStoppedSweating" });
  if (s.size > 0 && input.hr != null && input.hr > maxHr) medical.push({ key: "reasonSymptomHr", vars: { max: maxHr } });
  if (medical.length) return { level: "medical", reasons: medical, action: "actionMedical", regimen: REGIMENS[REGIMENS.length - 1] };

  const stop: Reason[] = [];
  if (s.size >= 2) stop.push({ key: "reasonTwoSymptoms", vars: { n: s.size } });
  if (input.recoveryHr != null && input.recoveryHr > RECOVERY_HR_LIMIT) stop.push({ key: "reasonRecoveryHr" });
  if (input.urine != null && input.urine >= 6) stop.push({ key: "reasonDarkUrine" });
  if (stop.length) return { level: "stop", reasons: stop, action: "actionStop", regimen: REGIMENS[REGIMENS.length - 1] };

  const rest: Reason[] = [];
  if (s.size === 1) rest.push({ key: "reasonOneSymptom" });
  if (input.urine != null && input.urine >= 4) rest.push({ key: "reasonUrineMid" });
  if (input.riskFactors.length) rest.push({ key: "reasonRiskFactor" });
  if ((input.hoursInHeat ?? 0) >= 4) rest.push({ key: "reasonLongHours" });
  if ((input.hotDayStreak ?? 0) >= 3) rest.push({ key: "reasonHotStreak", vars: { n: input.hotDayStreak! } });
  if (rest.length) return { level: "rest", reasons: rest, action: "actionRest", regimen: stricter(regimen) };

  return { level: "ok", reasons: [], action: "actionOk", regimen };
}
