"use client";

import { useEffect, useState } from "react";
import { Loader2, Siren } from "lucide-react";
import { AlertView, useAlert } from "@/components/alert";
import { PageTop } from "@/components/page-top";
import { Button } from "@/components/ui/button";
import { loadHistory, type HistoryEntry } from "@/lib/alert-client";
import { WORLD_CITIES, cityHref, cityKey, type City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { cityName, placeName } from "@/lib/places";
import { ok, useCities } from "@/lib/use-cities";

const DEFAULT = WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!;
const near = (e: HistoryEntry, c: City) => Math.abs(e.lat - c.lat) < 0.01 && Math.abs(e.lon - c.lon) < 0.01;

/** "What is the current warning?": the latest saved alert for the chosen city, or one click to generate it. */
export function AlertsTop() {
  const { t, lang, locale } = useT();
  const { cities, data } = useCities();
  const [key, setKey] = useState(cityKey(DEFAULT));
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const refresh = () => setHistory(loadHistory());
    refresh();
    window.addEventListener("heatsignal-history", refresh);
    return () => window.removeEventListener("heatsignal-history", refresh);
  }, []);

  const options = [...cities].sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang), lang));
  const city = options.find((c) => cityKey(c) === key) ?? options[0] ?? DEFAULT;
  const state = data[cityKey(city)];
  const hour = ok(state) ? state.now : null;
  const latest = history.find((e) => near(e, city));

  return (
    <PageTop
      title={t("aiAlertsTitle")}
      intro={t("alertsQuestion")}
      aside={
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">{t("city")}</span>
          <select
            className="h-11 w-full rounded-md border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
            value={cityKey(city)}
            onChange={(e) => setKey(e.target.value)}
          >
            {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{placeName(o, lang)}</option>)}
          </select>
        </label>
      }
      answer={hour ? <Answer key={cityKey(city)} city={city} hour={hour} latest={latest} locale={locale} /> : null}
    />
  );
}

function Answer({ city, hour, latest, locale }: { city: City; hour: CombinedHour; latest?: HistoryEntry; locale: string }) {
  const { t, lang } = useT();
  const state = useAlert(city, hour);
  const shown = state.alert ?? latest?.alert;
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-card p-4 sm:p-5">
        {state.loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("generatingAlert")}</p>
        ) : state.error ? (
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        ) : shown ? (
          <>
            {!state.alert && latest && (
              <p className="mb-3 text-xs text-muted-foreground">{t("latestAlertFrom", { time: new Date(latest.at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) })}</p>
            )}
            <AlertView alert={shown} note={state.alert ? state.note : undefined} title={t("healthAlertFor", { city: cityName(city.name, lang) })} subtitle={`WBGT ${hour.wbgt.toFixed(1)} °C`} path={cityHref(city)} />
          </>
        ) : (
          <p className="text-base">{t("noAlertForCity", { city: cityName(city.name, lang) })}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row [&>*]:h-12 [&>*]:text-base">
        <Button onClick={state.generate} disabled={state.loading}>
          {state.loading ? <Loader2 className="animate-spin" /> : <Siren />} {shown ? t("regenerate") : t("generateAlert")}
        </Button>
      </div>
    </div>
  );
}

