"use client";

import { useEffect, useState } from "react";
import { Bluetooth, HeartPulse, Phone, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KEYS, readJson, today, writeJson, type StatusMap } from "@/lib/device-store";
import { useT, type Key } from "@/lib/i18n";
import { INTENSITIES, workRegimen, type Intensity, type WorkerContext } from "@/lib/work-rest";
import { RISK_FACTORS, STATUS_COLOR, STATUS_KEY, SYMPTOMS, workerStatus, type CheckIn } from "@/lib/worker-status";
import { cn } from "@/lib/utils";

/** Urine colour chart, 1 (well hydrated) to 8 (severely dehydrated). */
const URINE = ["#fdfbe3", "#faf3b5", "#f5e98a", "#efdb5f", "#e5c63d", "#d6aa22", "#bd8b15", "#96680c"];

interface Saved extends CheckIn {
  id?: string;
  work?: Intensity;
}
const EMPTY: Saved = { symptoms: [], riskFactors: [] };

/** Opens the SOS dialog (components/sos-button.tsx listens for this). */
export const openSos = () => window.dispatchEvent(new Event("heatsignal-sos"));

type HrDevice = { gatt?: { connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<HrChar> }> }> } };
type HrChar = EventTarget & { startNotifications(): Promise<unknown>; value?: DataView };
type Bt = { requestDevice(o: { filters: { services: string[] }[] }): Promise<HrDevice> };

const numberIn = "h-10 w-24 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Optional, consented worker check-in. Answers stay on this device; only the status level (OK / rest /
 * stop / medic) is shared with the crew board on the same device, and only if the worker gives a crew ID.
 */
export function WorkerCheckin({ wbgt, ctx, hotDayStreak }: { wbgt: number; ctx: WorkerContext; hotDayStreak?: number }) {
  const { t } = useT();
  const [consent, setConsent] = useState<"yes" | "no" | null>(null);
  const [data, setData] = useState<Saved>(EMPTY);
  const [bt, setBt] = useState<Bt | null>(null);
  const [btState, setBtState] = useState<"idle" | "connecting" | "on" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(readJson<"yes" | "no" | null>(KEYS.consent, null));
    setData({ ...EMPTY, ...readJson<Saved>(KEYS.myCheckIn, EMPTY) });
    setBt((navigator as unknown as { bluetooth?: Bt }).bluetooth ?? null);
    setLoaded(true);
  }, []);

  const work = data.work ?? "heavy";
  const site = workRegimen(wbgt, work, ctx);
  const status = workerStatus({ ...data, hotDayStreak }, site);

  // Save the answers on this device, and the status level only under the crew ID.
  useEffect(() => {
    if (!loaded || consent !== "yes") return;
    writeJson(KEYS.myCheckIn, data);
    const id = data.id?.trim();
    if (id) {
      const all = readJson<StatusMap>(KEYS.statuses, {});
      writeJson(KEYS.statuses, { ...all, [id]: { level: status.level, date: today() } });
    }
  }, [data, status.level, consent, loaded]);

  const set = (patch: Partial<Saved>) => setData((d) => ({ ...d, ...patch }));
  const toggle = <T extends string>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Math.min(250, Math.round(Number(v)) || 0)));

  function decide(c: "yes" | "no") {
    setConsent(c);
    writeJson(KEYS.consent, c);
  }

  function deleteAll() {
    const id = data.id?.trim();
    if (id) {
      const all = readJson<StatusMap>(KEYS.statuses, {});
      delete all[id];
      writeJson(KEYS.statuses, all);
    }
    writeJson(KEYS.myCheckIn, undefined);
    writeJson(KEYS.consent, undefined);
    setData(EMPTY);
    setConsent(null);
  }

  async function connectStrap() {
    if (!bt) return;
    setBtState("connecting");
    try {
      const device = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
      const server = await device.gatt!.connect();
      const ch = await (await server.getPrimaryService("heart_rate")).getCharacteristic("heart_rate_measurement");
      ch.addEventListener("characteristicvaluechanged", () => {
        const v = ch.value;
        if (!v) return;
        // Heart Rate Measurement: bit 0 of the flags says whether the value is 8 or 16 bits.
        const bpm = v.getUint8(0) & 1 ? v.getUint16(1, true) : v.getUint8(1);
        setData((d) => ({ ...d, hr: bpm }));
      });
      await ch.startNotifications();
      setBtState("on");
    } catch {
      setBtState("failed");
    }
  }

  if (!loaded) return null;

  if (consent !== "yes") {
    return (
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /> {t("checkinTitle")}</CardTitle>
          <CardDescription>{consent === "no" ? t("checkinDeclined") : t("checkinIntro")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {consent !== "no" && (
            <p className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {t("checkinConsent")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 px-6 text-base" onClick={() => decide("yes")}>{t("agree")}</Button>
            {consent !== "no" && <Button className="h-11 px-6 text-base" variant="outline" onClick={() => decide("no")}>{t("noThanks")}</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="space-y-1 text-sm">
      <span className="block text-muted-foreground">{label}</span>
      {el}
    </label>
  );
  const check = (checked: boolean, onChange: () => void, label: string) => (
    <label key={label} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={checked} onChange={onChange} />
      {label}
    </label>
  );

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /> {t("checkinTitle")}</CardTitle>
        <CardDescription>{t("checkinOnDevice")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="rounded-lg border-2 p-4"
          style={{ borderColor: STATUS_COLOR[status.level], backgroundColor: `${STATUS_COLOR[status.level]}14` }}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-2xl font-black uppercase tracking-tight" style={{ color: status.level === "medical" ? undefined : STATUS_COLOR[status.level] }}>
              {t(STATUS_KEY[status.level])}
            </div>
            {status.level === "medical" && (
              <Button className="h-11 bg-red-600 px-5 text-base text-white hover:bg-red-700" onClick={openSos}>
                <Phone /> {t("callEmergency")}
              </Button>
            )}
          </div>
          <p className="mt-2 text-base font-semibold">{t(status.action)}</p>
          {status.level !== "medical" && status.level !== "stop" && (
            <p className="mt-1 text-sm text-muted-foreground">{t("yourSchedule", { regimen: t(status.regimen.key) })}</p>
          )}
          {status.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 ps-5 text-sm">
              {status.reasons.map((r) => <li key={r.key}>{t(r.key, r.vars)}</li>)}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field(t("crewIdOptional"), (
            <input className={`${numberIn} w-32`} maxLength={12} value={data.id ?? ""} placeholder="W1" onChange={(e) => set({ id: e.target.value.replace(/[^\p{L}\p{N}\- ]/gu, "") })} />
          ))}
          <div className="space-y-1 text-sm">
            <span className="block text-muted-foreground">{t("myWorkType")}</span>
            <Tabs value={work} onValueChange={(v) => set({ work: v as Intensity })}>
              <TabsList>{INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{t(i.labelKey)}</TabsTrigger>)}</TabsList>
            </Tabs>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("symptomsNow")}</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SYMPTOMS.map((s) => check(data.symptoms.includes(s), () => set({ symptoms: toggle(data.symptoms, s) }), t(`symptom${s[0].toUpperCase()}${s.slice(1)}` as Key)))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("urineColour")}</legend>
          <div className="flex flex-wrap gap-1.5" dir="ltr">
            {URINE.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-pressed={data.urine === i + 1}
                aria-label={t("urineShade", { n: i + 1 })}
                onClick={() => set({ urine: data.urine === i + 1 ? undefined : i + 1 })}
                className={cn("flex h-11 w-11 items-center justify-center rounded-md border text-xs font-semibold text-slate-800", data.urine === i + 1 && "ring-2 ring-primary ring-offset-2")}
                style={{ backgroundColor: c }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("urineHint")}</p>
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          {field(t("heartRate"), <input type="number" inputMode="numeric" dir="ltr" className={numberIn} value={data.hr ?? ""} onChange={(e) => set({ hr: num(e.target.value) })} />)}
          {field(t("recoveryHeartRate"), <input type="number" inputMode="numeric" dir="ltr" className={numberIn} value={data.recoveryHr ?? ""} onChange={(e) => set({ recoveryHr: num(e.target.value) })} />)}
          {field(t("ageOptional"), <input type="number" inputMode="numeric" dir="ltr" className={numberIn} value={data.age ?? ""} onChange={(e) => set({ age: num(e.target.value) })} />)}
          {field(t("hoursInHeat"), <input type="number" inputMode="numeric" dir="ltr" className={numberIn} value={data.hoursInHeat ?? ""} onChange={(e) => set({ hoursInHeat: num(e.target.value) })} />)}
          {bt && (
            <Button variant="outline" onClick={connectStrap} disabled={btState === "connecting"}>
              <Bluetooth /> {btState === "on" ? t("strapConnected") : btState === "failed" ? t("strapFailed") : t("connectStrap")}
            </Button>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("riskFactors")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {RISK_FACTORS.map((r) => check(data.riskFactors.includes(r), () => set({ riskFactors: toggle(data.riskFactors, r) }), t(`risk${r[0].toUpperCase()}${r.slice(1)}` as Key)))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-xl text-xs text-muted-foreground">{t("checkinConsent")}</p>
          <Button variant="outline" onClick={deleteAll}><Trash2 /> {t("deleteMyData")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
