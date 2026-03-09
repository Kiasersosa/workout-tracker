/**
 * Strength score algorithm:
 * 1. Estimate 1RM per exercise using Epley formula
 * 2. Compare to body-weight-normalized strength standards
 * 3. Score 0-100 per exercise, then average
 */

// Strength standard coefficients: at a score of 50 (intermediate),
// expected 1RM = bodyweight × coefficient
const STRENGTH_COEFFICIENTS: Record<string, number> = {
  "Barbell Bench Press": 1.25,
  "Incline Barbell Press": 1.0,
  "Dumbbell Bench Press": 0.65, // per dumbbell
  "Barbell Back Squat": 1.6,
  "Front Squat": 1.3,
  "Leg Press": 2.5,
  "Conventional Deadlift": 2.0,
  "Sumo Deadlift": 2.0,
  "Romanian Deadlift": 1.4,
  "Overhead Press": 0.75,
  "Barbell Row": 1.1,
  "Pull-Up": 1.0, // bodyweight
  "Barbell Curl": 0.55,
  "Hip Thrust": 1.8,
  "Dumbbell Shoulder Press": 0.4, // per dumbbell
  "Dumbbell Row": 0.55, // per dumbbell
  "Lat Pulldown": 0.9,
  "Tricep Pushdown": 0.45,
  "Lateral Raise": 0.15, // per dumbbell
};

/** Epley formula: estimate 1RM from weight × reps */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Score a single exercise 0-100 based on estimated 1RM vs standards */
export function scoreExercise(
  exerciseName: string,
  estimated1RM: number,
  bodyWeight: number
): number | null {
  const coefficient = STRENGTH_COEFFICIENTS[exerciseName];
  if (!coefficient || bodyWeight <= 0) return null;

  // Intermediate standard (score 50) = bodyweight × coefficient
  const intermediateStandard = bodyWeight * coefficient;

  // Linear scale: ratio of 1.0 = score 50
  const ratio = estimated1RM / intermediateStandard;

  // Map ratio to 0-100: 0 → 0, 0.5 → 25, 1.0 → 50, 1.5 → 75, 2.0 → 100
  const score = Math.round(ratio * 50);
  return Math.max(0, Math.min(100, score));
}

/** Get strength tier label */
export function getStrengthTier(score: number): string {
  if (score < 20) return "Untrained";
  if (score < 35) return "Beginner";
  if (score < 50) return "Intermediate";
  if (score < 65) return "Advanced";
  if (score < 80) return "Elite";
  return "World Class";
}

/** Get tier color */
export function getTierColor(score: number): string {
  if (score < 20) return "text-slate-400";
  if (score < 35) return "text-blue-400";
  if (score < 50) return "text-green-400";
  if (score < 65) return "text-yellow-400";
  if (score < 80) return "text-orange-400";
  return "text-red-400";
}

/** Calculate overall strength score from workout history */
export function calculateOverallScore(
  exerciseMaxes: { exerciseName: string; weight: number; reps: number }[],
  bodyWeight: number
): { overall: number; exercises: { name: string; score: number; e1rm: number }[] } {
  const scored: { name: string; score: number; e1rm: number }[] = [];

  for (const { exerciseName, weight, reps } of exerciseMaxes) {
    const e1rm = estimate1RM(weight, reps);
    const score = scoreExercise(exerciseName, e1rm, bodyWeight);
    if (score !== null) {
      scored.push({ name: exerciseName, score, e1rm });
    }
  }

  if (scored.length === 0) return { overall: 0, exercises: [] };

  const overall = Math.round(
    scored.reduce((sum, s) => sum + s.score, 0) / scored.length
  );

  return { overall, exercises: scored };
}
