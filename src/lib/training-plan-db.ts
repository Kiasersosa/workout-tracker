import { db } from "./db";

export interface PlannedExercise {
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number;
  notes: string;
}

export interface WorkoutDay {
  day_number: number;
  day_name: string;
  exercises: PlannedExercise[];
}

export interface TrainingPlan {
  overview: string;
  days: WorkoutDay[];
  goals: string;
  createdAt: string;
  currentDayIndex: number;
}

const PLAN_KEY = "training_plan";
const PROFILE_KEY = "trainer_profile";

export interface TrainerProfile {
  goals: string;
  experienceLevel: string;
  daysPerWeek: number;
  equipment: string;
  injuries: string;
}

export async function getTrainingPlan(): Promise<TrainingPlan | null> {
  const setting = await db.settings.get(PLAN_KEY);
  if (!setting) return null;
  return JSON.parse(setting.value as string);
}

export async function saveTrainingPlan(plan: TrainingPlan): Promise<void> {
  await db.settings.put({ key: PLAN_KEY, value: JSON.stringify(plan) });
}

export async function getNextWorkoutDay(): Promise<WorkoutDay | null> {
  const plan = await getTrainingPlan();
  if (!plan || plan.days.length === 0) return null;
  return plan.days[plan.currentDayIndex % plan.days.length];
}

export async function advanceWorkoutDay(): Promise<void> {
  const plan = await getTrainingPlan();
  if (!plan) return;
  plan.currentDayIndex = (plan.currentDayIndex + 1) % plan.days.length;
  await saveTrainingPlan(plan);
}

export async function updatePlanWeights(
  dayNumber: number,
  updatedExercises: PlannedExercise[]
): Promise<void> {
  const plan = await getTrainingPlan();
  if (!plan) return;

  const dayIndex = plan.days.findIndex((d) => d.day_number === dayNumber);
  if (dayIndex >= 0) {
    plan.days[dayIndex].exercises = updatedExercises;
    await saveTrainingPlan(plan);
  }
}

export async function getTrainerProfile(): Promise<TrainerProfile | null> {
  const setting = await db.settings.get(PROFILE_KEY);
  if (!setting) return null;
  return JSON.parse(setting.value as string);
}

export async function saveTrainerProfile(profile: TrainerProfile): Promise<void> {
  await db.settings.put({ key: PROFILE_KEY, value: JSON.stringify(profile) });
}
