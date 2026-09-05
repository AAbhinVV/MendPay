import { DashboardFrame } from "@/components/dashboard";
import { WorkspaceSkeleton } from "@/components/workspace-skeleton";
export default function Loading() {
  return (
    <DashboardFrame>
      <WorkspaceSkeleton />
    </DashboardFrame>
  );
}
