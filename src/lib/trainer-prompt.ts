export function buildTrainerPrompt(
  userGoals: string,
  experienceLevel: string,
  daysPerWeek: number,
  equipment: string,
  injuries: string,
  recentWorkouts: Array<{
    date: string;
    exercise_name: string;
    actual_weight: string;
    actual_reps: string;
    difficulty: string;
  }>,
  bodyWeight?: string
): string {
  const workoutHistory =
    recentWorkouts.length > 0
      ? recentWorkouts
          .map(
            (w) =>
              `${w.date} | ${w.exercise_name} | ${w.actual_weight}lb × ${w.actual_reps} | Difficulty: ${w.difficulty || "N/A"}`
          )
          .join("\n")
      : "No workout history yet — this is a new trainee.";

  return `You are an elite strength and conditioning coach with deep knowledge of current exercise science research. Design a training program based on the latest evidence from peer-reviewed research on hypertrophy, strength, and rehabilitation.

## Trainee Profile
- **Goals:** ${userGoals}
- **Experience Level:** ${experienceLevel}
- **Training Days per Week:** ${daysPerWeek}
- **Available Equipment:** ${equipment}
- **Injuries/Limitations:** ${injuries || "None reported"}
${bodyWeight ? `- **Body Weight:** ${bodyWeight} lb` : ""}

## Recent Workout History
${workoutHistory}

## Scientific Principles to Apply
- Progressive overload (manage volume and intensity systematically)
- Optimal weekly volume per muscle group (10-20 hard sets based on experience)
- Evidence-based rep ranges (6-12 for hypertrophy, 1-5 for strength, 15-30 for endurance)
- RIR/proximity to failure management
- Appropriate exercise selection for muscle activation (EMG research)
- Periodization (undulating or linear based on experience)
- Recovery and deload considerations
- Joint-friendly alternatives when injuries are noted

## Difficulty Feedback System
The trainee rates each set as Easy, Moderate, Hard, or Impossible:
- **Easy** → Increase weight by 5lb (upper) or 10lb (lower) next session
- **Moderate** → Keep weight, this is the target zone
- **Hard** → Keep weight but monitor — if Hard for 2+ sessions, reduce by 5%
- **Impossible** → Reduce weight by 10% next session

## Output Format
Provide your response in two parts:

### Part 1: Program Overview
Briefly explain (3-5 sentences) the training split, rationale, and key principles you're applying.

### Part 2: Full Program
Output a JSON array of ALL workout days. Each day contains exercises with sets, reps, and weights.

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
        "notes": "Focus on controlled eccentric, 2-1-2 tempo"
      }
    ]
  }
]
\`\`\`

Important:
- Use exercise names that match standard gym exercises
- Set appropriate starting weights based on experience level and any workout history provided
- If no history, use conservative starting weights that can be progressed
- Include warm-up sets where appropriate (noted in the notes field)
- Include 4-6 exercises per day
- Order exercises from compound to isolation`;
}

export function buildAdjustmentPrompt(
  currentPlan: Array<{
    day_number: number;
    day_name: string;
    exercises: Array<{
      exercise_name: string;
      sets: number;
      reps: number;
      weight: number;
    }>;
  }>,
  completedWorkout: Array<{
    exercise_name: string;
    set_number: number;
    actual_weight: number;
    actual_reps: number;
    difficulty: string;
  }>
): string {
  const planSummary = currentPlan
    .map(
      (d) =>
        `Day ${d.day_number} (${d.day_name}): ${d.exercises.map((e) => `${e.exercise_name} ${e.sets}×${e.reps}@${e.weight}lb`).join(", ")}`
    )
    .join("\n");

  const workoutResults = completedWorkout
    .map(
      (s) =>
        `${s.exercise_name} | Set ${s.set_number} | ${s.actual_weight}lb × ${s.actual_reps} | ${s.difficulty}`
    )
    .join("\n");

  return `You are adjusting a training program based on the trainee's most recent workout performance.

## Current Program
${planSummary}

## Last Workout Results
${workoutResults}

## Adjustment Rules
- **Easy** → Increase weight by 5lb (upper body) or 10lb (lower body)
- **Moderate** → Perfect, keep the same weight
- **Hard** → Keep weight but flag for monitoring
- **Impossible** → Reduce weight by 10%

Update ONLY the exercises that were performed. Keep all other days unchanged.

Output the complete updated program as a JSON array (same format as the original):
\`\`\`json
[...]
\`\`\``;
}
