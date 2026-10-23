import { NextResponse } from "next/server";
import { getRepo, errorResponse, readJson } from "@/lib/db/api";

export const maxDuration = 15;

export async function GET() {
  try {
    return NextResponse.json({ projects: await getRepo().listProjects() });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const project = await getRepo().createProject(String(body.name ?? ""));
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
