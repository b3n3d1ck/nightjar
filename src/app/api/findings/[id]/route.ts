import { NextResponse } from "next/server";
import { getRepo, errorResponse, readJson } from "@/lib/db/api";
import type { FindingLifecycle } from "@/lib/db/types";

export const maxDuration = 15;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req);
    const finding = await getRepo().updateFindingStatus(id, String(body.status ?? "") as FindingLifecycle);
    return NextResponse.json({ finding });
  } catch (e) {
    return errorResponse(e);
  }
}
