import { AlertTriangle } from "lucide-react";

const SUPPLEMENTS =
  "These are general wellness suggestions based on environmental data. They are not medical advice. Talk to your doctor before starting any supplement, especially if you are pregnant, take medication or have a health condition.";

export function MedicalDisclaimer({ children = SUPPLEMENTS }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm" role="note">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        Health information disclaimer
      </p>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </div>
  );
}
