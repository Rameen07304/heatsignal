"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, FileDown, Loader2, Siren } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompoundBadge } from "@/components/risk-badge";
import { ShareDialog } from "@/components/share-dialog";
import { formatAqi } from "@/lib/air";
import { alertBody, alertToText, postAlert, saveToHistory } from "@/lib/alert-client";
import type { AlertText, HeatAlert } from "@/lib/alert-types";
import { cityHref, type City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { esc, openPrintable } from "@/lib/report";
import { LANGUAGES, translate, useT } from "@/lib/i18n";

/** Every language an alert can come in; each alert's headings are in its own language. */
export const LANGS = LANGUAGES.map((l) => ({
  key: l.code,
  label: l.label,
  dir: l.rtl ? "rtl" : "ltr",
  lang: l.code,
  headings: (["alertHRisk", "alertHWho", "alertHActions", "alertHWorkers"] as const).map((k) => translate(l.code, k)),
}));

export function AlertBody({ text, headings, dir, lang }: { text: AlertText; headings: readonly string[]; dir: string; lang: string }) {
  const lists: [string, string[]][] = [
    [headings[1], text.vulnerable_groups],
    [headings[2], text.actions],
    [headings[3], text.worker_safety],
  ];
  return (
    <div dir={dir} lang={lang} className="space-y-4 text-sm leading-relaxed">
      <section>
        <h4 className="mb-1 font-semibold">{headings[0]}</h4>
        <p>{text.risk_assessment}</p>
      </section>
      {lists.map(([h, items]) =>
        items.length ? (
          <section key={h}>
            <h4 className="mb-1 font-semibold">{h}</h4>
            <ul className="list-disc space-y-0.5 ps-5">
              {items.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

/** Opens the alert as a clean printable page; the browser's print dialog offers "Save as PDF". */
function printAlert(title: string, subtitle: string, alert: HeatAlert, note: string) {
  const blocks = LANGS.map((l) => {
    const t = alert[l.key];
    if (!t) return "";
    const list = (h: string, xs: string[]) => (xs.length ? `<h3>${esc(h)}</h3><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
    return `<section dir="${l.dir}" lang="${l.lang}"><h2>${esc(l.label)}</h2><h3>${esc(l.headings[0])}</h3><p>${esc(t.risk_assessment)}</p>${list(l.headings[1], t.vulnerable_groups)}${list(l.headings[2], t.actions)}${list(l.headings[3], t.worker_safety)}</section>`;
  }).join("");
  openPrintable(title, `${subtitle} · ${note}`, blocks);
}

const shareText = (title: string, t: AlertText, whatToDo: string) =>
  [`⚠️ ${title}`, "", t.risk_assessment, "", `${whatToDo}:`, ...t.actions.map((a) => `• ${a}`)].join("\n");

export function AlertView({
  alert,
  note,
  title,
  subtitle,
  path = "/",
}: {
  alert: HeatAlert;
  note?: string;
  title: string;
  subtitle: string;
  /** Page the shared link opens, e.g. the city page. */
  path?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t, lang } = useT();
  const first = alert[lang] ? lang : "en";
  const shown = alert[first] ?? alert.en;
  return (
    <div className="space-y-3">
      {note && (
        <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs">{note}</p>
      )}
      <Tabs defaultValue={first}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            {LANGS.filter((l) => alert[l.key] || l.key === "ur" || l.key === "ar").map((l) => (
              <TabsTrigger key={l.key} value={l.key} disabled={!alert[l.key]}>{l.label}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(alertToText(`${title}, ${subtitle}`, alert));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? t("copied") : t("copyAlert")}
            </Button>
            {shown && <ShareDialog title={title} text={shareText(title, shown, t("whatToDo"))} path={path} />}
            <Button size="sm" variant="outline" onClick={() => printAlert(title, subtitle, alert, t(alert.source === "ai" ? "aiReviewNote" : "rulesShortNote"))}>
              <FileDown /> {t("downloadPdf")}
            </Button>
          </div>
        </div>
        {LANGS.map((l) => {
          const t = alert[l.key];
          return t ? (
            <TabsContent key={l.key} value={l.key}>
              <AlertBody text={t} headings={l.headings} dir={l.dir} lang={l.lang} />
            </TabsContent>
          ) : null;
        })}
      </Tabs>
      {alert.source === "ai" && (
        <p className="text-xs text-muted-foreground">{t("aiGeneratedNote")}</p>
      )}
    </div>
  );
}

/** Generate a one-shot alert for a city's current hour and record it in the alert history. */
export function useAlert(city: City, hour: CombinedHour) {
  const { t, lang } = useT();
  const [alert, setAlert] = useState<HeatAlert | null>(null);
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setAlert(null);
    try {
      // The server's note is English; the reader gets the same message in their language.
      const { note, ...a } = await postAlert<HeatAlert & { note?: string }>(alertBody(city, hour, { lang }));
      void note;
      setAlert(a);
      setNote(a.source === "rules" ? t("rulesNote") : !a.ur || !a.ar || (lang !== "en" && !a[lang]) ? t("translationMissingNote") : undefined);
      saveToHistory(city, hour, a, "single");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  return { alert, note, error, loading, generate };
}

function summary(hour: CombinedHour) {
  return [
    `WBGT ${hour.wbgt.toFixed(1)} °C (${hour.risk})`,
    `${hour.temp.toFixed(1)} °C`,
    `${hour.rh.toFixed(0)}% humidity`,
    hour.air && `AQI ${formatAqi(hour.air.aqi)}`,
    hour.air && `UV ${hour.air.uv.toFixed(0)}`,
  ].filter(Boolean).join(" · ");
}

function AlertState({ state, city, hour }: { state: ReturnType<typeof useAlert>; city: City; hour: CombinedHour }) {
  const { t } = useT();
  return (
    <>
      {state.loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("generatingAlert")}
        </div>
      )}
      {state.error && (
        <div role="alert" className="space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {state.error}
          </p>
          <Button size="sm" variant="outline" onClick={state.generate}>{t("retry")}</Button>
        </div>
      )}
      {state.alert && (
        <AlertView alert={state.alert} note={state.note} title={t("healthAlertFor", { city: city.name })} subtitle={summary(hour)} path={cityHref(city)} />
      )}
    </>
  );
}

export function AlertDialog({ city, hour, label, ...buttonProps }: { city: City; hour: CombinedHour; label?: string } & ButtonProps) {
  const state = useAlert(city, hour);
  const { t } = useT();
  return (
    <Dialog onOpenChange={(open) => open && !state.alert && !state.loading && state.generate()}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>
          <Siren /> {label ?? t("generateAlert")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {t("healthAlertFor", { city: city.name })} {hour.score != null && <CompoundBadge score={hour.score} />}
          </DialogTitle>
          <DialogDescription>{summary(hour)}</DialogDescription>
        </DialogHeader>
        <AlertState state={state} city={city} hour={hour} />
      </DialogContent>
    </Dialog>
  );
}

/** Inline version for the city page. */
export function AlertSection({ city, hour }: { city: City; hour: CombinedHour }) {
  const state = useAlert(city, hour);
  const { t } = useT();
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{t("aiHealthAlert")}</CardTitle>
          <CardDescription>{t("aiHealthAlertIntro")}</CardDescription>
        </div>
        <Button onClick={state.generate} disabled={state.loading}>
          <Siren /> {state.alert ? t("regenerate") : t("generateDetailedAlert")}
        </Button>
      </CardHeader>
      {(state.loading || state.error || state.alert) && (
        <CardContent>
          <AlertState state={state} city={city} hour={hour} />
        </CardContent>
      )}
    </Card>
  );
}
