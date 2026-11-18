import { AlertTriangle } from "lucide-react";

export function MedicalDisclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="note">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        Health information disclaimer
      </p>
      <p className="mt-1 text-muted-foreground">
        These are general wellness suggestions based on environmental data, not medical advice. They are not a substitute
        for professional diagnosis or treatment. Consult your healthcare provider before starting any supplement,
        especially if you are pregnant, nursing, taking medication or have a medical condition.
      </p>
    </div>
  );
}
