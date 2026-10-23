import { NextResponse } from "next/server";
import { getRepo, errorResponse } from "@/lib/db/api";

export const maxDuration = 15;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ events: await getRepo().listAudit(id) });
  } catch (e) {
    return errorResponse(e);
  }
}
