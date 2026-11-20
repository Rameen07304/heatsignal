"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useT();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
      <p className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" /> {message}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>{t("retry")}</Button>
    </div>
  );
}
