import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthContext, isErrorResponse } from "@/lib/api-helpers";
import { readRowsAsObjects, appendRows, overwriteTab } from "@/lib/sheets";
import { buildAnalysisPrompt } from "@/lib/ai-prompt";
import { v4 as uuidv4 } from "uuid";

const anthropic = new Anthropic();

export async function POST() {
  const ctx = await getAuthContext();
  if (isErrorResponse(ctx)) return ctx;

  try {
    // Read data from Sheets
    const [workouts, routines, body] = await Promise.all([
      readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Workout Log"),
      readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Routines"),
      readRowsAsObjects(ctx.accessToken, ctx.spreadsheetId, "Body Measurements"),
    ]);

    if (workouts.length === 0) {
      return NextResponse.json(
        { error: "No workout data to analyze" },
        { status: 400 }
      );
    }

    // Get last 50 workout rows for context
    const recentWorkouts = workouts.slice(-50);
    const latestBody = body.length > 0 ? body[body.length - 1] : null;

    const prompt = buildAnalysisPrompt(
      recentWorkouts as Array<{
        workout_id: string;
        date: string;
        exercise_name: string;
        muscle_group: string;
        set_number: string;
        target_reps: string;
        target_weight: string;
        actual_reps: string;
        actual_weight: string;
        rpe: string;
      }>,
      routines as Array<{
        exercise_name: string;
        target_sets: string;
        target_reps: string;
        target_weight: string;
      }>,
      latestBody?.body_weight
    );

    // Call Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to extract the JSON routine from the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let newRoutine: Array<{
      exercise_name: string;
      target_sets: number;
      target_reps: number;
      target_weight: number;
      progression_note: string;
      ai_rationale: string;
    }> = [];

    if (jsonMatch) {
      try {
        newRoutine = JSON.parse(jsonMatch[1]);
      } catch {
        // If JSON parsing fails, we still return the analysis text
      }
    }

    // Save new routine to Sheets if parsed successfully
    if (newRoutine.length > 0) {
      const routineId = uuidv4();
      const now = new Date().toISOString().split("T")[0];

      // Determine next workout number
      const workoutNumbers = workouts
        .map((w) => parseInt(w.workout_id?.split("-")[0] || "0"))
        .filter((n) => !isNaN(n));
      const nextWorkout = Math.max(0, ...workoutNumbers) + 1;

      const routineRows = newRoutine.map((r, i) => [
        routineId,
        now,
        nextWorkout,
        i + 1,
        r.exercise_name,
        r.target_sets,
        r.target_reps,
        r.target_weight,
        r.progression_note,
        r.ai_rationale,
      ]);

      await overwriteTab(ctx.accessToken, ctx.spreadsheetId, "Routines", routineRows);
    }

    return NextResponse.json({
      analysis: responseText,
      routine: newRoutine,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze workout" },
      { status: 500 }
    );
  }
}
