import { Suspense } from "react";
import { Dashboard, DashboardFrame } from "@/components/dashboard";
import { WorkspaceSkeleton } from "@/components/workspace-skeleton";
import { getWorkspace } from "@/lib/server-api";
export const metadata = { title: "Recovery workspace" };
export const dynamic = "force-dynamic";
async function RecoveryWorkspace() {
  return <Dashboard initial={await getWorkspace()} />;
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <DashboardFrame>
          <WorkspaceSkeleton />
        </DashboardFrame>
      }
    >
      <RecoveryWorkspace />
    </Suspense>
  );
}
