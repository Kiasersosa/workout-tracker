import { db } from "./db";
import { v4 as uuidv4 } from "uuid";

export interface Goal {
  id: string;
  exerciseName: string;
  metric: "weight" | "reps" | "e1rm";
  currentValue: number;
  targetValue: number;
  startDate: string;
  targetDate: string;
  status: "active" | "completed" | "abandoned";
}

const GOALS_KEY = "goals";

/** Get all goals from settings */
export async function getGoals(): Promise<Goal[]> {
  const setting = await db.settings.get(GOALS_KEY);
  if (!setting) return [];
  return JSON.parse(setting.value as string);
}

/** Save all goals to settings */
export async function saveGoals(goals: Goal[]): Promise<void> {
  await db.settings.put({ key: GOALS_KEY, value: JSON.stringify(goals) });
}

/** Add a new goal */
export async function addGoal(
  goal: Omit<Goal, "id" | "status">
): Promise<Goal> {
  const goals = await getGoals();
  const newGoal: Goal = { ...goal, id: uuidv4(), status: "active" };
  goals.push(newGoal);
  await saveGoals(goals);
  return newGoal;
}

/** Update goal progress */
export async function updateGoalProgress(
  goalId: string,
  currentValue: number
): Promise<void> {
  const goals = await getGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return;

  goal.currentValue = currentValue;
  if (currentValue >= goal.targetValue) {
    goal.status = "completed";
  }
  await saveGoals(goals);
}

/** Delete a goal */
export async function deleteGoal(goalId: string): Promise<void> {
  const goals = await getGoals();
  await saveGoals(goals.filter((g) => g.id !== goalId));
}
