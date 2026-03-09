import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { readRowsAsObjects, overwriteTab } from "@/lib/sheets";

export async function GET() {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const rows = await readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Routines");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reading routines:", error);
    return NextResponse.json({ error: "Failed to read routines" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const routines: Array<{
      routine_id: string;
      created_date: string;
      workout_number: number;
      exercise_order: number;
      exercise_name: string;
      target_sets: number;
      target_reps: number;
      target_weight: number;
      progression_note: string;
      ai_rationale: string;
    }> = body;

    const rows = routines.map((r) => [
      r.routine_id,
      r.created_date,
      r.workout_number,
      r.exercise_order,
      r.exercise_name,
      r.target_sets,
      r.target_reps,
      r.target_weight,
      r.progression_note,
      r.ai_rationale,
    ]);

    await overwriteTab(ctx.accessToken, ctx.spreadsheetId, "Routines", rows);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing routines:", error);
    return NextResponse.json({ error: "Failed to write routines" }, { status: 500 });
  }
}
