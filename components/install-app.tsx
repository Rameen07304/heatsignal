"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

// Chrome/Edge/Android only; Safari has no install prompt (users add it from the Share menu instead).
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registers the service worker, and shows "Install app" when the browser offers it. */
export function InstallApp() {
  const { t } = useT();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    // Not in development: a cached dev build would hide code changes.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={t("installApp")}
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      <Download /> <span className="hidden sm:inline">{t("installApp")}</span>
    </Button>
  );
}
