"use client";

import { Shirt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLOTHING, effectiveWbgt, type Clothing } from "@/lib/work-rest";
import { useWorkerContext } from "@/lib/use-worker-context";
import { useT } from "@/lib/i18n";

/** Clothing/PPE and acclimatisation for the crew. Every work tool on the page reads it. */
export function WorkerContextPicker() {
  const [ctx, setCtx] = useWorkerContext();
  const { t, n } = useT();
  const adjust = effectiveWbgt(0, ctx);
  const clothing = CLOTHING.find((c) => c.key === ctx.clothing)!;

  return (
    <Card className="no-print">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Shirt className="h-4 w-4 text-primary" /> {t("crewConditions")}</CardTitle>
          <CardDescription>{t("crewConditionsIntro")}</CardDescription>
        </div>
        {adjust > 0 && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t("adjustedWbgt", { n: n(adjust, 1) })}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="space-y-1">
          <Tabs value={ctx.clothing} onValueChange={(v) => setCtx({ ...ctx, clothing: v as Clothing })}>
            <TabsList aria-label={t("clothing")} className="h-auto flex-wrap">
              {CLOTHING.map((c) => <TabsTrigger key={c.key} value={c.key}>{t(c.labelKey)}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">{t(clothing.noteKey)}</p>
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            checked={!ctx.acclimatised}
            onChange={(e) => setCtx({ ...ctx, acclimatised: !e.target.checked })}
          />
          {t("newToHeatLong")}
        </label>
      </CardContent>
    </Card>
  );
}
