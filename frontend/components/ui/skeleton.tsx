import { cn } from "@/lib/utils";

// shadcn/ui Skeleton pattern, kept local so the design tokens remain ours.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
