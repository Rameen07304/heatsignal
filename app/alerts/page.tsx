import type { Metadata } from "next";
import { AlertHistory } from "@/components/alert-history";
import { AlertsTop } from "@/components/alerts-top";
import { LiveGenerator } from "@/components/live-generator";
import { PageHeading } from "@/components/page-heading";
import { AlertsSection } from "@/components/alerts-section";

export const metadata: Metadata = { title: "AI Alerts", description: "How HeatSignal writes a health alert: risk numbers first, then AI agents that explain, advise and translate." };

export default function AlertsPage() {
  return (
    <div className="space-y-8">
      <AlertsTop />
      <AlertsSection title="howAgentsWork">
        <PageHeading title="liveAlertTitle" intro="aiAlertsIntro" />
        <LiveGenerator />
      </AlertsSection>
      <AlertHistory />
    </div>
  );
}
