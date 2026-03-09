import { db, type WorkoutSet } from "./db";
import { v4 as uuidv4 } from "uuid";

/** Get the next workout number (sequential) */
export async function getNextWorkoutNumber(): Promise<number> {
  const lastSet = await db.workoutSets.orderBy("workoutNumber").last();
  return lastSet ? lastSet.workoutNumber + 1 : 1;
}

/** Get the last workout's actuals for a given exercise (for smart prefill) */
export async function getLastWorkoutForExercise(
  exerciseName: string
): Promise<WorkoutSet[]> {
  // Find the most recent workoutId that has this exercise
  const lastSet = await db.workoutSets
    .where("exerciseName")
    .equals(exerciseName)
    .reverse()
    .sortBy("id");

  if (lastSet.length === 0) return [];

  const lastWorkoutId = lastSet[0].workoutId;

  // Get all sets from that workout for this exercise
  return db.workoutSets
    .where({ workoutId: lastWorkoutId, exerciseName })
    .sortBy("setNumber");
}

/** Create a new workout ID */
export function createWorkoutId(): string {
  return uuidv4();
}

/** Save or update a workout set (auto-save) */
export async function saveWorkoutSet(set: WorkoutSet): Promise<number> {
  const id = await db.workoutSets.put(set) as number;

  // Add to sync queue
  await db.syncQueue.add({
    type: "workoutSet",
    action: set.id ? "update" : "create",
    data: { ...set, id },
    createdAt: new Date().toISOString(),
    retries: 0,
  });

  return id;
}

/** Get all sets for a workout */
export async function getWorkoutSets(
  workoutId: string
): Promise<WorkoutSet[]> {
  return db.workoutSets.where("workoutId").equals(workoutId).sortBy("id");
}

/** Get recent workouts (grouped by workoutId) */
export async function getRecentWorkouts(
  limit = 10
): Promise<{ workoutId: string; date: string; workoutNumber: number; exerciseCount: number }[]> {
  const allSets = await db.workoutSets.orderBy("workoutNumber").reverse().toArray();

  const seen = new Map<
    string,
    { workoutId: string; date: string; workoutNumber: number; exercises: Set<string> }
  >();

  for (const set of allSets) {
    if (!seen.has(set.workoutId)) {
      seen.set(set.workoutId, {
        workoutId: set.workoutId,
        date: set.date,
        workoutNumber: set.workoutNumber,
        exercises: new Set(),
      });
    }
    seen.get(set.workoutId)!.exercises.add(set.exerciseName);
    if (seen.size >= limit) break;
  }

  return [...seen.values()].map((w) => ({
    workoutId: w.workoutId,
    date: w.date,
    workoutNumber: w.workoutNumber,
    exerciseCount: w.exercises.size,
  }));
}
