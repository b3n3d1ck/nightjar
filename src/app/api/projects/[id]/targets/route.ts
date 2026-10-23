import { NextResponse } from "next/server";
import { getRepo, errorResponse, readJson } from "@/lib/db/api";

export const maxDuration = 15;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ targets: await getRepo().listTargets(id) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req);
    const target = await getRepo().addTarget(id, String(body.value ?? ""), String(body.kind ?? "url"));
    return NextResponse.json({ target }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
