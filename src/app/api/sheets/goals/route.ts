import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { readRowsAsObjects, overwriteTab } from "@/lib/sheets";

export async function GET() {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const rows = await readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Goals");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reading goals:", error);
    return NextResponse.json({ error: "Failed to read goals" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const goals: Array<{
      goal_id: string;
      exercise_name: string;
      metric: string;
      current_value: number;
      target_value: number;
      start_date: string;
      target_date: string;
      status: string;
    }> = await req.json();

    const rows = goals.map((g) => [
      g.goal_id,
      g.exercise_name,
      g.metric,
      g.current_value,
      g.target_value,
      g.start_date,
      g.target_date,
      g.status,
    ]);

    await overwriteTab(ctx.accessToken, ctx.spreadsheetId, "Goals", rows);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing goals:", error);
    return NextResponse.json({ error: "Failed to write goals" }, { status: 500 });
  }
}
