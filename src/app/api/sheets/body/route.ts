import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { appendRows, readRowsAsObjects } from "@/lib/sheets";

export async function GET() {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const rows = await readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Body Measurements");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reading body measurements:", error);
    return NextResponse.json({ error: "Failed to read measurements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const row = [
      body.date,
      body.body_weight,
      body.chest,
      body.waist,
      body.hips,
      body.left_bicep,
      body.right_bicep,
      body.left_thigh,
      body.right_thigh,
      body.neck,
    ];

    await appendRows(ctx.accessToken, ctx.spreadsheetId, "Body Measurements", [row]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing body measurements:", error);
    return NextResponse.json({ error: "Failed to write measurements" }, { status: 500 });
  }
}
