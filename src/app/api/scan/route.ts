import { NextResponse } from "next/server";
import { scan, ScanRejected } from "@/lib/scan/engine";

export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { url?: unknown; authorized?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "A target URL is required." }, { status: 400 });
  }
  if (body.authorized !== true) {
    return NextResponse.json(
      { error: "You must confirm you are authorized to test this target." },
      { status: 403 },
    );
  }

  try {
    const result = await scan(url);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ScanRejected) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The scan could not complete. The target may be unreachable." },
      { status: 502 },
    );
  }
}
