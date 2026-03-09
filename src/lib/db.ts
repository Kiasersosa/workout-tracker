import Dexie, { type EntityTable } from "dexie";

export interface WorkoutSet {
  id?: number;
  workoutId: string;
  workoutNumber: number;
  date: string; // ISO date
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  rpe: number | null;
  notes: string;
  syncedAt: string | null;
}

export interface BodyMeasurement {
  id?: number;
  date: string;
  bodyWeight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  leftBicep: number | null;
  rightBicep: number | null;
  leftThigh: number | null;
  rightThigh: number | null;
  neck: number | null;
  syncedAt: string | null;
}

export interface SyncQueueItem {
  id?: number;
  type: "workoutSet" | "bodyMeasurement" | "routine" | "goal";
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

export interface Routine {
  id?: number;
  routineId: string;
  createdDate: string;
  workoutNumber: number;
  exerciseOrder: number;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  progressionNote: string;
  aiRationale: string;
  syncedAt: string | null;
}

export interface AppSettings {
  key: string;
  value: string | number | boolean;
}

const db = new Dexie("WorkoutTrackerDB") as Dexie & {
  workoutSets: EntityTable<WorkoutSet, "id">;
  bodyMeasurements: EntityTable<BodyMeasurement, "id">;
  syncQueue: EntityTable<SyncQueueItem, "id">;
  routines: EntityTable<Routine, "id">;
  settings: EntityTable<AppSettings, "key">;
};

db.version(1).stores({
  workoutSets:
    "++id, workoutId, workoutNumber, date, exerciseName, muscleGroup, syncedAt",
  bodyMeasurements: "++id, date, syncedAt",
  syncQueue: "++id, type, createdAt",
  routines: "++id, routineId, workoutNumber, exerciseName, syncedAt",
  settings: "key",
});

export { db };
