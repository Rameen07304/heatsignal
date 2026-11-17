import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("shimmer rounded-md", className)} {...p} />
);
