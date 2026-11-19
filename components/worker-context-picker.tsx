"use client";

import { Shirt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLOTHING, effectiveWbgt, type Clothing } from "@/lib/work-rest";
import { useWorkerContext } from "@/lib/use-worker-context";

/** Clothing/PPE and acclimatisation for the crew. Every work tool on the page reads it. */
export function WorkerContextPicker() {
  const [ctx, setCtx] = useWorkerContext();
  const adjust = effectiveWbgt(0, ctx);
  const clothing = CLOTHING.find((c) => c.key === ctx.clothing)!;

  return (
    <Card className="no-print">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Shirt className="h-4 w-4 text-primary" /> Crew conditions</CardTitle>
          <CardDescription>
            Heavier clothing and lack of acclimatisation make the same weather more dangerous, so schedules get stricter.
          </CardDescription>
        </div>
        {adjust > 0 && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Adjusted: +{adjust.toFixed(1)} °C effective WBGT
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="space-y-1">
          <Tabs value={ctx.clothing} onValueChange={(v) => setCtx({ ...ctx, clothing: v as Clothing })}>
            <TabsList aria-label="Clothing and protective equipment" className="h-auto flex-wrap">
              {CLOTHING.map((c) => <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">{clothing.note}</p>
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            checked={!ctx.acclimatised}
            onChange={(e) => setCtx({ ...ctx, acclimatised: !e.target.checked })}
          />
          New to the heat (first 2 weeks, or back from leave)
        </label>
      </CardContent>
    </Card>
  );
}
