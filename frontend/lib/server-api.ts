import "server-only";
import { cache } from "react";
import type { Workspace } from "./types";

export const apiOrigin = () =>
  process.env.SAFERECOVER_API_URL || "http://127.0.0.1:8000";
export const getWorkspace = cache(async (): Promise<Workspace> => {
  try {
    const response = await fetch(`${apiOrigin()}/api/studio`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return await response.json();
  } catch {
    return {
      cases: [],
      mode: "simulation",
      error:
        "The recovery API is unavailable. Start FastAPI on port 8000, then refresh the workspace.",
    };
  }
});
