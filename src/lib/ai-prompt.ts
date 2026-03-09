interface WorkoutData {
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
}

interface RoutineEntry {
  exercise_name: string;
  target_sets: string;
  target_reps: string;
  target_weight: string;
}

export function buildAnalysisPrompt(
  recentWorkouts: WorkoutData[],
  currentRoutine: RoutineEntry[],
  bodyWeight?: string
): string {
  const workoutTable = recentWorkouts
    .map(
      (w) =>
        `${w.date} | ${w.exercise_name} | Set ${w.set_number} | Target: ${w.target_weight}lb×${w.target_reps} | Actual: ${w.actual_weight}lb×${w.actual_reps} | RPE: ${w.rpe || "N/A"}`
    )
    .join("\n");

  const routineTable =
    currentRoutine.length > 0
      ? currentRoutine
          .map(
            (r) =>
              `${r.exercise_name} | ${r.target_sets} sets × ${r.target_reps} reps @ ${r.target_weight}lb`
          )
          .join("\n")
      : "No current routine set.";

  return `You are an expert strength coach analyzing a trainee's workout data. Be encouraging but honest. Use simple language.

## Trainee Info
${bodyWeight ? `Body weight: ${bodyWeight} lb` : "Body weight: not provided"}

## Current Routine
${routineTable}

## Recent Workout Log
${workoutTable}

## Your Task
Analyze the most recent workout and provide:

1. **Performance Summary** (2-3 sentences): How did they do? Did they hit their targets?

2. **Key Observations** (2-3 bullet points): Note any standout performances, missed targets, or concerning RPE patterns.

3. **Progression Recommendations**: For each exercise in the workout, recommend the target weight and reps for next session. Follow these rules:
   - If they hit all target reps across all sets → increase weight by 5lb (upper body) or 10lb (lower body)
   - If they hit target reps on some sets but not all → keep same weight
   - If they missed reps on most sets → reduce weight by 5-10%
   - RPE 9-10 on most sets → consider keeping weight the same even if reps were hit
   - RPE below 7 → they can likely handle more weight

4. **Next Workout Plan**: Output a JSON array of the recommended routine for next workout:
\`\`\`json
[
  {
    "exercise_name": "Exercise Name",
    "target_sets": 3,
    "target_reps": 8,
    "target_weight": 135,
    "progression_note": "Brief reason for change",
    "ai_rationale": "Detailed reasoning"
  }
]
\`\`\`

Keep your analysis concise and actionable. Focus on progressive overload.`;
}

/** Simple offline fallback: if all reps hit, bump weight */
export function offlineProgression(
  exerciseName: string,
  muscleGroup: string,
  sets: { targetReps: number | null; targetWeight: number | null; actualReps: number | null; actualWeight: number | null }[]
): { targetWeight: number; targetReps: number; note: string } {
  const lastWeight = sets[0]?.actualWeight ?? sets[0]?.targetWeight ?? 0;
  const lastReps = sets[0]?.targetReps ?? 8;

  const allRepsHit = sets.every(
    (s) => s.actualReps !== null && s.targetReps !== null && s.actualReps >= s.targetReps
  );

  const isLower = ["Quads", "Hamstrings", "Glutes", "Calves"].includes(muscleGroup);
  const increment = isLower ? 10 : 5;

  if (allRepsHit) {
    return {
      targetWeight: lastWeight + increment,
      targetReps: lastReps,
      note: `Hit all reps — increase by ${increment}lb`,
    };
  }

  const mostMissed =
    sets.filter(
      (s) => s.actualReps !== null && s.targetReps !== null && s.actualReps < s.targetReps
    ).length >
    sets.length / 2;

  if (mostMissed) {
    return {
      targetWeight: Math.round(lastWeight * 0.9),
      targetReps: lastReps,
      note: "Missed most sets — reduce weight 10%",
    };
  }

  return {
    targetWeight: lastWeight,
    targetReps: lastReps,
    note: "Partial completion — keep same weight",
  };
}
