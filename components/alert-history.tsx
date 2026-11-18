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

const FIELD =
  "h-9 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AlertHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState<string | null>(null);
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
          <CardTitle>Alert history</CardTitle>
          <CardDescription>
            Every alert generated in this browser, from city pages, cards and the live pipeline. Click a row to read it.
          </CardDescription>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => confirm("Delete all saved alerts from this browser?") && clearHistory()}>
            <Trash2 /> Clear history
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input aria-label="Filter by city" placeholder="City…" className="h-9 w-44" value={city} onChange={(e) => setCity(e.target.value)} />
          <select aria-label="Filter by risk level" className={FIELD} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All risk levels</option>
            {COMPOUND_BANDS.map((b) => <option key={b.level} value={b.level}>{b.level}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            From <input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            To <input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No alerts yet. Generate one above, or from any city.
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No alerts match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>Generated</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Compound</TableHead>
                <TableHead>Heat</TableHead>
                <TableHead>Air</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((e) => (
                <Fragment key={e.id}>
                  <TableRow className="cursor-pointer" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                    <TableCell>{open === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell>{new Date(e.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                    <TableCell className="font-medium">{e.city}</TableCell>
                    <TableCell>{e.score != null ? <CompoundBadge score={e.score} /> : "–"}</TableCell>
                    <TableCell><RiskBadge level={e.heatRisk} /></TableCell>
                    <TableCell>{e.aqi != null ? <AqiBadge aqi={e.aqi} short /> : "–"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.alert.source === "ai" ? "Gemini" : "Rules"} · {e.mode === "pipeline" ? "multi-agent" : "single call"}
                    </TableCell>
                  </TableRow>
                  {open === e.id && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="whitespace-normal bg-muted/30 p-4">
                        <AlertView alert={e.alert} title={`Health alert: ${e.city}`} subtitle={new Date(e.at).toLocaleString()} path={cityHref({ name: e.city, country: "", lat: e.lat, lon: e.lon })} />
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
