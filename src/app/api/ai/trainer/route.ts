import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { buildTrainerPrompt, buildAdjustmentPrompt } from "@/lib/trainer-prompt";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    let prompt: string;

    if (action === "generate") {
      const {
        goals,
        experienceLevel,
        daysPerWeek,
        equipment,
        injuries,
        recentWorkouts,
        bodyWeight,
      } = body;

      prompt = buildTrainerPrompt(
        goals,
        experienceLevel,
        daysPerWeek,
        equipment,
        injuries,
        recentWorkouts || [],
        bodyWeight
      );
    } else if (action === "adjust") {
      const { currentPlan, completedWorkout } = body;
      prompt = buildAdjustmentPrompt(currentPlan, completedWorkout);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON plan from response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let plan = null;

    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[1]);
      } catch {
        // Return raw text if JSON parsing fails
      }
    }

    // Extract overview text (everything before the JSON block)
    const overview = responseText
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/### Part 2[\s\S]*/g, "")
      .replace(/### Part 1:?\s*Program Overview\s*/g, "")
      .trim();

    return NextResponse.json({ overview, plan });
  } catch (error) {
    console.error("Trainer AI error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
