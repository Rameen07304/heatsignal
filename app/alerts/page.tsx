import type { Metadata } from "next";
import { AlertHistory } from "@/components/alert-history";
import { LiveGenerator } from "@/components/live-generator";

export const metadata: Metadata = { title: "Agentic alerts" };

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agentic alerts</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Each alert is built by a pipeline of specialised agents. The numbers come from a deterministic Risk Analyzer —
          the AI agents never invent measurements. Three Gemini agents then write the assessment, recommend actions
          and translate. If the AI is unavailable, HeatSignal’s rule-based guidance takes over, so a warning always
          goes out.
        </p>
      </div>
      <LiveGenerator />
      <AlertHistory />
    </div>
  );
}
