import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">This page doesn’t exist</h1>
      <p className="text-sm text-muted-foreground">The link may be old or mistyped. The dashboard has every city and tool.</p>
      <Button asChild>
        <Link href="/">Go to the dashboard</Link>
      </Button>
    </div>
  );
}
