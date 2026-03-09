import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert strength and conditioning coach with deep knowledge of current exercise science research (hypertrophy, strength, rehabilitation, periodization). You're friendly, encouraging, and speak in simple terms.

Your job is to have a natural conversation with the user to understand their goals, experience, available equipment, schedule, and any injuries. Then design a personalized training program.

## Conversation Flow
1. Start by asking about their primary fitness goals
2. Ask about their experience level and training history
3. Ask how many days per week they can train
4. Ask what equipment they have access to
5. Ask about any injuries or physical limitations
6. Ask about their current body weight (helpful for setting starting weights)
7. Based on their answers, recommend a training split and explain your reasoning using current research
8. Ask if they want to adjust anything
9. When they're happy with the plan, generate the full program

## When generating the final plan
When the user confirms they want the plan, output it in this EXACT format with the marker TRAINING_PLAN_JSON:

TRAINING_PLAN_JSON
\`\`\`json
[
  {
    "day_number": 1,
    "day_name": "Upper Body Push",
    "exercises": [
      {
        "exercise_name": "Barbell Bench Press",
        "muscle_group": "Chest",
        "sets": 4,
        "reps": 8,
        "weight": 135,
        "rest_seconds": 120,
        "notes": "Control the eccentric, 2 sec down"
      }
    ]
  }
]
\`\`\`

## Rules for plan generation
- Use standard exercise names
- Set conservative starting weights for beginners, appropriate weights for experienced lifters
- Include 4-6 exercises per day, ordered compound to isolation
- Apply evidence-based volume (10-20 sets per muscle group per week)
- Use appropriate rep ranges (6-12 hypertrophy, 1-5 strength, 15-30 endurance)
- Note rest periods and any technique cues
- Consider injuries and provide alternatives

IMPORTANT: Only output the TRAINING_PLAN_JSON block when the user has confirmed they want you to generate the plan. During conversation, just chat naturally.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Check if the response contains a training plan
    let plan = null;
    if (text.includes("TRAINING_PLAN_JSON")) {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          plan = JSON.parse(jsonMatch[1]);
        } catch {
          // JSON parse failed, just return text
        }
      }
    }

    // Clean the display text (remove the JSON block for display)
    const displayText = text
      .replace(/TRAINING_PLAN_JSON\s*/, "")
      .replace(/```json[\s\S]*?```/, "")
      .trim();

    return NextResponse.json({ text: displayText, plan });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
