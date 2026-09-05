import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET() {
  try {
    const guide = await readFile(
      path.join(process.cwd(), "..", "outputs", "MendPay-Project-Guide.md"),
      "utf8",
    );
    return new Response(guide, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          "attachment; filename=MendPay-Project-Guide.md",
      },
    });
  } catch {
    return new Response(
      "The guide file is missing. Run this frontend from its frontend directory alongside the outputs folder.",
      { status: 404 },
    );
  }
}
