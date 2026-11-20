"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertView } from "@/components/alert";
import { cityHref } from "@/lib/cities";
import { AqiBadge, CompoundBadge, RiskBadge } from "@/components/risk-badge";
import { clearHistory, loadHistory, type HistoryEntry } from "@/lib/alert-client";
import { COMPOUND_BANDS } from "@/lib/risk";
import { levelKey, useT } from "@/lib/i18n";

const FIELD =
  "h-9 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AlertHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const { t, locale } = useT();
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const refresh = () => setEntries(loadHistory());
    refresh();
    window.addEventListener("heatsignal-history", refresh);
    return () => window.removeEventListener("heatsignal-history", refresh);
  }, []);

  const shown = entries.filter((e) => {
    const day = e.at.slice(0, 10);
    return (
      (!city || e.city.toLowerCase().includes(city.trim().toLowerCase())) &&
      (!level || e.level === level) &&
      (!from || day >= from) &&
      (!to || day <= to)
    );
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{t("alertHistory")}</CardTitle>
          <CardDescription>{t("alertHistoryIntro")}</CardDescription>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => confirm(t("confirmClearHistory")) && clearHistory()}>
            <Trash2 /> {t("clearHistory")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input aria-label={t("filterByCity")} placeholder={t("cityPlaceholder")} className="h-9 w-44" value={city} onChange={(e) => setCity(e.target.value)} />
          <select aria-label={t("filterByLevel")} className={FIELD} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">{t("allRiskLevels")}</option>
            {COMPOUND_BANDS.map((b) => <option key={b.level} value={b.level}>{t(levelKey(b.level))}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("from")} <input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("to")} <input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("noAlertsYet")}
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("noAlertsMatch")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>{t("generated")}</TableHead>
                <TableHead>{t("city")}</TableHead>
                <TableHead>{t("compoundShort")}</TableHead>
                <TableHead>{t("heatShort")}</TableHead>
                <TableHead>{t("airShort")}</TableHead>
                <TableHead>{t("source")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((e) => (
                <Fragment key={e.id}>
                  <TableRow className="cursor-pointer" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                    <TableCell>{open === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell>{new Date(e.at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                    <TableCell className="font-medium">{e.city}</TableCell>
                    <TableCell>{e.score != null ? <CompoundBadge score={e.score} /> : "–"}</TableCell>
                    <TableCell><RiskBadge level={e.heatRisk} /></TableCell>
                    <TableCell>{e.aqi != null ? <AqiBadge aqi={e.aqi} short /> : "–"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.alert.source === "ai" ? "AI" : t("rulesWord")} · {e.mode === "pipeline" ? t("multiAgent") : t("singleCall")}
                    </TableCell>
                  </TableRow>
                  {open === e.id && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="whitespace-normal bg-muted/30 p-4">
                        <AlertView alert={e.alert} title={t("healthAlertFor", { city: e.city })} subtitle={new Date(e.at).toLocaleString(locale)} path={cityHref({ name: e.city, country: "", lat: e.lat, lon: e.lon })} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
