import { NextRequest, NextResponse } from "next/server";
import { apiOrigin } from "@/lib/server-api";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params;
  const route = path.join("/");
  const allowed =
    request.method === "GET"
      ? route === ""
      : route === "seed" ||
        /^cases\/rcv_[a-f0-9]+\/(approve|observe|original-paid|recovery-paid|duplicate)$/.test(
          route,
        );
  if (!allowed)
    return NextResponse.json(
      { detail: "This demo action is not available." },
      { status: 404 },
    );
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    // Next may normalize nextUrl's hostname internally. Compare the browser's
    // Origin to the actual request Host instead, without trusting forwarded hosts.
    let sameOrigin = false;
    try {
      sameOrigin =
        !!origin &&
        new URL(origin).host === request.headers.get("host") &&
        new URL(origin).protocol === request.nextUrl.protocol;
    } catch {
      /* malformed origin is rejected */
    }
    if (!sameOrigin)
      return NextResponse.json(
        { detail: "Use the workspace to perform this action." },
        { status: 403 },
      );
  }
  try {
    const response = await fetch(
      `${apiOrigin()}/api/studio${route ? `/${route}` : ""}`,
      {
        method: request.method,
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    const body = await response.json();
    return NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "The recovery API did not respond. Start FastAPI on port 8000, then try again. Refresh before retrying an approval.",
      },
      { status: 502 },
    );
  }
}
export { proxy as GET, proxy as POST };
