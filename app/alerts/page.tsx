import type { Metadata } from "next";
import { AlertHistory } from "@/components/alert-history";
import { LiveGenerator } from "@/components/live-generator";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "AI Alerts", description: "How HeatSignal writes a health alert: risk numbers first, then AI agents that explain, advise and translate." };

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="aiAlertsTitle" intro="aiAlertsIntro" />
      <LiveGenerator />
      <AlertHistory />
    </div>
  );
}
