"use client";

import { useEffect, useState } from "react";
import { Plus, Repeat, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShareDialog } from "@/components/share-dialog";
import type { CombinedHour } from "@/lib/conditions";
import { KEYS, STORE_EVENT, isSmallCell, readJson, todaysStatuses, writeJson, type StatusMap } from "@/lib/device-store";
import { useT, type Key } from "@/lib/i18n";
import { CLOTHING, INTENSITIES, type Clothing, type Intensity, type Regimen } from "@/lib/work-rest";
import { nextBreak, regimenFor, rotation, type Cell, type Member } from "@/lib/crew";
import { STATUS_COLOR, STATUS_KEY, type StatusLevel } from "@/lib/worker-status";

const SELECT = "h-10 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CELL_KEY: Record<Cell, Key> = { heavy: "cellHeavy", lighter: "cellLighter", rest: "cellRest" };
const CELL_STYLE: Record<Cell, string> = {
  heavy: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  lighter: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  rest: "bg-muted text-muted-foreground",
};

/** Supervisor view of the crew: schedule and a status word per person. Never symptoms, heart rate or risk factors. */
export function CrewBoard({ hours, now }: { hours: CombinedHour[]; now: CombinedHour }) {
  const { t } = useT();
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [form, setForm] = useState<Member>({ id: "", work: "heavy", clothing: "normal", acclimatised: true });
  const [showRotation, setShowRotation] = useState(false);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    const load = () => {
      setMembers(readJson<Member[]>(KEYS.crew, []));
      setStatuses(todaysStatuses());
      setMinute(new Date().getMinutes());
    };
    load();
    window.addEventListener(STORE_EVENT, load);
    const id = setInterval(load, 60_000);
    return () => {
      window.removeEventListener(STORE_EVENT, load);
      clearInterval(id);
    };
  }, []);

  const save = (next: Member[]) => {
    setMembers(next);
    writeJson(KEYS.crew, next);
  };
  function add(e: React.FormEvent) {
    e.preventDefault();
    const id = form.id.trim();
    if (!id || members.some((m) => m.id === id)) return;
    save([...members, { ...form, id }]);
    setForm({ ...form, id: "" });
  }

  const from = Math.max(0, hours.findIndex((h) => h.time === now.time));
  const ahead = hours.slice(from);
  const grid = showRotation ? rotation(members, ahead, statuses) : [];
  const statusOf = (m: Member) => statuses[m.id]?.level;

  const counts = (["ok", "rest", "stop", "medical"] as StatusLevel[]).map((l) => [l, members.filter((m) => statusOf(m) === l).length] as const);
  const notIn = members.filter((m) => !statusOf(m)).length;
  // Shared outside this device, so small counts are hidden.
  const shown = (n: number) => (isSmallCell(n) ? t("fewerThan5") : String(n));
  const summary = [
    t("crewSummaryTitle"),
    ...counts.filter(([, n]) => n > 0).map(([l, n]) => `${t(STATUS_KEY[l])}: ${shown(n)}`),
    notIn ? `${t("notCheckedIn")}: ${shown(notIn)}` : null,
  ].filter(Boolean).join("\n");

  const regimenNow = (m: Member): Regimen => regimenFor(m, now.wbgt);

  return (
    <Card className="no-print">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t("crewBoard")}</CardTitle>
          <CardDescription>{t("crewBoardIntro")}</CardDescription>
        </div>
        {members.length > 0 && <ShareDialog title={t("crewSummaryTitle")} text={summary} path="/worker-safety" label={t("shareSummary")} variant="outline" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("nicknameOrId")}</span>
            <input className={`${SELECT} w-28`} maxLength={12} placeholder="W1" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.replace(/[^\p{L}\p{N}\- ]/gu, "") })} />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("task")}</span>
            <select className={SELECT} value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value as Intensity })}>
              {INTENSITIES.map((i) => <option key={i.key} value={i.key}>{t(i.labelKey)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("clothing")}</span>
            <select className={SELECT} value={form.clothing} onChange={(e) => setForm({ ...form, clothing: e.target.value as Clothing })}>
              {CLOTHING.map((c) => <option key={c.key} value={c.key}>{t(c.labelKey)}</option>)}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!form.acclimatised} onChange={(e) => setForm({ ...form, acclimatised: !e.target.checked })} />
            {t("newToHeatShort")}
          </label>
          <Button type="submit" disabled={!form.id.trim()}><Plus /> {t("addMember")}</Button>
        </form>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("crewEmpty")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("nicknameOrId")}</TableHead>
                    <TableHead>{t("task")}</TableHead>
                    <TableHead>{t("regimenNow")}</TableHead>
                    <TableHead>{t("nextBreak")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead><span className="sr-only">{t("remove")}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const r = regimenNow(m);
                    const s = statusOf(m);
                    const b = nextBreak(m, ahead, minute);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.id}</TableCell>
                        <TableCell>{t(INTENSITIES.find((i) => i.key === m.work)!.labelKey)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />{t(r.key)}</span>
                        </TableCell>
                        <TableCell className="tabular-nums" dir="ltr">{b === "stopped" ? t("stopped") : b === "now" ? t("breakNow") : b === "none" ? t("noBreakNeeded") : b}</TableCell>
                        <TableCell>
                          {s ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />{t(STATUS_KEY[s])}</span>
                          ) : (
                            <span className="text-muted-foreground">{t("notCheckedIn")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" aria-label={`${t("remove")} ${m.id}`} onClick={() => save(members.filter((x) => x.id !== m.id))}><Trash2 /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <Button variant="outline" onClick={() => setShowRotation(!showRotation)}><Repeat /> {t("suggestRotation")}</Button>
              {showRotation && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("rotationIntro")}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 text-start font-medium text-muted-foreground">{t("nicknameOrId")}</th>
                          {ahead.slice(0, grid.length).map((h) => <th key={h.time} className="p-2 text-center font-medium tabular-nums text-muted-foreground" dir="ltr">{h.time.slice(11, 16)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m, j) => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2 font-medium">{m.id}</td>
                            {grid.map((row, i) => <td key={i} className="p-1"><span className={`block rounded px-2 py-1.5 text-center text-xs font-medium ${CELL_STYLE[row[j]]}`}>{t(CELL_KEY[row[j]])}</span></td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">{t("crewPrivacy")}</p>
      </CardContent>
    </Card>
  );
}
