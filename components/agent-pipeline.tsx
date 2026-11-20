"use client";

import { Brain, CloudSun, Languages, ListChecks, Send, Sparkles } from "lucide-react";
import { useT, type Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type StageId = "data" | "analyze" | "compose" | "recommend" | "translate" | "deliver";
export type StageStatus = "idle" | "running" | "done" | "fallback" | "error";

export const STAGES: { id: StageId; name: Key; role: Key; icon: typeof Brain; ai: boolean }[] = [
  { id: "data", name: "stgData", role: "stgDataRole", icon: CloudSun, ai: false },
  { id: "analyze", name: "stgAnalyze", role: "stgAnalyzeRole", icon: Brain, ai: false },
  { id: "compose", name: "stgCompose", role: "stgComposeRole", icon: Sparkles, ai: true },
  { id: "recommend", name: "stgRecommend", role: "stgRecommendRole", icon: ListChecks, ai: true },
  { id: "translate", name: "stgTranslate", role: "stgTranslateRole", icon: Languages, ai: true },
  { id: "deliver", name: "stgDeliver", role: "stgDeliverRole", icon: Send, ai: false },
];

const RING: Record<StageStatus, string> = {
  idle: "border-border",
  running: "border-primary bg-primary/5",
  done: "border-green-500/70",
  fallback: "border-yellow-500/70",
  error: "border-red-500/70",
};

function Node({ stage, status }: { stage: (typeof STAGES)[number]; status: StageStatus }) {
  const Icon = stage.icon;
  const { t } = useT();
  return (
    <div className={cn("glass relative rounded-lg border-2 p-3 transition-all duration-300", RING[status])}>
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted", status === "running" && "animate-pulse bg-primary/20")}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{t(stage.name)}</div>
          <div className="text-xs text-muted-foreground">{stage.ai ? t("aiAgent") : t("deterministic")}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t(stage.role)}</p>
    </div>
  );
}

/** Animated connector: a dash pattern that flows in the direction of the data. */
function Flow({ vertical, active }: { vertical?: boolean; active?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center", vertical ? "h-6" : "h-6 lg:h-auto lg:w-6")} aria-hidden="true">
      <div
        className={cn("rounded-full", vertical ? "h-full w-[3px]" : "h-full w-[3px] lg:h-[3px] lg:w-full")}
        style={{
          backgroundImage: `repeating-linear-gradient(${vertical ? "180deg" : "var(--flow-angle, 180deg)"}, hsl(var(--primary) / ${active ? 1 : 0.5}) 0 6px, transparent 6px 12px)`,
          backgroundSize: vertical ? "100% 24px" : "var(--flow-size, 100% 24px)",
          animation: "pipeline-flow 0.8s linear infinite",
        }}
      />
    </div>
  );
}

/**
 * Data → Risk Analyzer → Alert Composer → Action Recommender → Translator → Delivery.
 * Stacks vertically on small screens.
 */
export function AgentPipeline({ status }: { status: Partial<Record<StageId, StageStatus>> }) {
  const st = (id: StageId) => status[id] ?? "idle";
  return (
    <div className="pipeline grid gap-0 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr_24px_1fr_24px_1fr] lg:items-stretch">
      {STAGES.map((s, i) => (
        <div key={s.id} className="contents">
          {i > 0 && <Flow active={st(s.id) === "running"} />}
          <Node stage={s} status={st(s.id)} />
        </div>
      ))}
    </div>
  );
}
