import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { appendRows, readRowsAsObjects } from "@/lib/sheets";

export async function GET() {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const rows = await readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Workout Log");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reading workouts:", error);
    return NextResponse.json({ error: "Failed to read workouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const sets: Array<{
      workout_id: string;
      date: string;
      exercise_name: string;
      muscle_group: string;
      set_number: number;
      target_reps: number | null;
      target_weight: number | null;
      actual_reps: number | null;
      actual_weight: number | null;
      rpe: number | null;
      notes: string;
    }> = Array.isArray(body) ? body : [body];

    const rows = sets.map((s) => [
      s.workout_id,
      s.date,
      s.exercise_name,
      s.muscle_group,
      s.set_number,
      s.target_reps,
      s.target_weight,
      s.actual_reps,
      s.actual_weight,
      s.rpe,
      s.notes,
      new Date().toISOString(),
    ]);

    await appendRows(ctx.accessToken, ctx.spreadsheetId, "Workout Log", rows);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error("Error writing workouts:", error);
    return NextResponse.json({ error: "Failed to write workouts" }, { status: 500 });
  }
}
