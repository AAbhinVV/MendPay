import { Skeleton } from "@/components/ui/skeleton";
export function WorkspaceSkeleton() {
  return (
    <div
      className="workspace-skeleton"
      role="status"
      aria-label="Loading recovery workspace"
    >
      <span className="sr-only">Loading recovery cases…</span>
      <div className="metric-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="metric" key={i}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-6 h-10 w-36" />
            <Skeleton className="mt-4 h-3 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 h-48 w-full rounded-2xl" />
      <div className="mt-8 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton className="h-16 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}
