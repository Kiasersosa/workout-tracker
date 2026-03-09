import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { appendRows, readRows } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const items: Array<{
      type: string;
      action: string;
      data: Record<string, unknown>;
    }> = body.items;

    let synced = 0;
    let duplicates = 0;

    // Get existing workout IDs for dedup
    const existingRows = await readRows(ctx.accessToken, ctx.spreadsheetId, "Workout Log");
    const existingKeys = new Set(
      existingRows.map((row) => `${row[0]}-${row[2]}-${row[4]}`) // workout_id-exercise-set_number
    );

    // Group by type
    const workoutSets: (string | number | null)[][] = [];
    const bodyMeasurements: (string | number | null)[][] = [];

    for (const item of items) {
      if (item.type === "workoutSet" && item.action === "create") {
        const d = item.data;
        const key = `${d.workoutId}-${d.exerciseName}-${d.setNumber}`;
        if (existingKeys.has(key)) {
          duplicates++;
          continue;
        }
        workoutSets.push([
          d.workoutId as string,
          d.date as string,
          d.exerciseName as string,
          d.muscleGroup as string,
          d.setNumber as number,
          d.targetReps as number | null,
          d.targetWeight as number | null,
          d.actualReps as number | null,
          d.actualWeight as number | null,
          d.rpe as number | null,
          d.notes as string,
          new Date().toISOString(),
        ]);
      } else if (item.type === "bodyMeasurement" && item.action === "create") {
        const d = item.data;
        bodyMeasurements.push([
          d.date as string,
          d.bodyWeight as number | null,
          d.chest as number | null,
          d.waist as number | null,
          d.hips as number | null,
          d.leftBicep as number | null,
          d.rightBicep as number | null,
          d.leftThigh as number | null,
          d.rightThigh as number | null,
          d.neck as number | null,
        ]);
      }
    }

    if (workoutSets.length > 0) {
      await appendRows(ctx.accessToken, ctx.spreadsheetId, "Workout Log", workoutSets);
      synced += workoutSets.length;
    }

    if (bodyMeasurements.length > 0) {
      await appendRows(ctx.accessToken, ctx.spreadsheetId, "Body Measurements", bodyMeasurements);
      synced += bodyMeasurements.length;
    }

    return NextResponse.json({ success: true, synced, duplicates });
  } catch (error) {
    console.error("Error syncing:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
