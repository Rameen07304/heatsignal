"use client";

import { ErrorState } from "@/components/error-state";

// Keeps the sidebar and header alive if a page throws.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Something went wrong on this page." onRetry={reset} />;
}
