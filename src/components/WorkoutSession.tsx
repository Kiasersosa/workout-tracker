"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import ExerciseBrowser from "./ExerciseBrowser";
import {
  createWorkoutId,
  getNextWorkoutNumber,
  getLastWorkoutForExercise,
  saveWorkoutSet,
} from "@/lib/workout-helpers";
import type { WorkoutSet } from "@/lib/db";

interface ExerciseEntry {
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  sets: SetRow[];
  collapsed: boolean;
}

interface SetRow {
  dbId?: number;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  rpe: number | null;
}

interface WorkoutSessionProps {
  onFinish: () => void;
}

export default function WorkoutSession({ onFinish }: WorkoutSessionProps) {
  const [workoutId] = useState(() => createWorkoutId());
  const [workoutNumber, setWorkoutNumber] = useState(1);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNextWorkoutNumber().then(setWorkoutNumber);
  }, []);

  const addExercise = useCallback(
    async (exercise: { name: string; muscleGroup: string; equipment: string }) => {
      // Smart prefill from last workout
      const lastSets = await getLastWorkoutForExercise(exercise.name);
      const prefillSets: SetRow[] =
        lastSets.length > 0
          ? lastSets.map((s, i) => ({
              setNumber: i + 1,
              targetReps: s.actualReps,
              targetWeight: s.actualWeight,
              actualReps: null,
              actualWeight: s.actualWeight,
              rpe: null,
            }))
          : [1, 2, 3].map((n) => ({
              setNumber: n,
              targetReps: null,
              targetWeight: null,
              actualReps: null,
              actualWeight: null,
              rpe: null,
            }));

      setExercises((prev) => [
        ...prev,
        {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          sets: prefillSets,
          collapsed: false,
        },
      ]);
      setShowBrowser(false);
    },
    []
  );

  const updateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: keyof SetRow, value: number | null) => {
      setExercises((prev) => {
        const next = [...prev];
        const exercise = { ...next[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        exercise.sets = sets;
        next[exerciseIndex] = exercise;
        return next;
      });
    },
    []
  );

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const exercise = { ...next[exerciseIndex] };
      exercise.sets = [
        ...exercise.sets,
        {
          setNumber: exercise.sets.length + 1,
          targetReps: null,
          targetWeight: null,
          actualReps: null,
          actualWeight: null,
          rpe: null,
        },
      ];
      next[exerciseIndex] = exercise;
      return next;
    });
  }, []);

  const removeExercise = useCallback((exerciseIndex: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
  }, []);

  const toggleCollapse = useCallback((exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[exerciseIndex] = {
        ...next[exerciseIndex],
        collapsed: !next[exerciseIndex].collapsed,
      };
      return next;
    });
  }, []);

  // Auto-save: debounced save to IndexedDB on every change
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (exercises.length === 0) return;
      setSaving(true);
      const date = new Date().toISOString().split("T")[0];

      for (const exercise of exercises) {
        for (const set of exercise.sets) {
          const workoutSet: WorkoutSet = {
            id: set.dbId,
            workoutId,
            workoutNumber,
            date,
            exerciseName: exercise.exerciseName,
            muscleGroup: exercise.muscleGroup,
            setNumber: set.setNumber,
            targetReps: set.targetReps,
            targetWeight: set.targetWeight,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
            rpe: set.rpe,
            notes: "",
            syncedAt: null,
          };
          const id = await saveWorkoutSet(workoutSet);
          if (!set.dbId) set.dbId = id;
        }
      }
      setSaving(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [exercises, workoutId, workoutNumber]);

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workout #{workoutNumber}</h1>
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            {saving && " · Saving..."}
          </p>
        </div>
        <button
          onClick={onFinish}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
        >
          Finish
        </button>
      </div>

      {exercises.map((exercise, exIdx) => (
        <div
          key={`${exercise.exerciseName}-${exIdx}`}
          className="mb-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
        >
          {/* Exercise header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <button
              onClick={() => toggleCollapse(exIdx)}
              className="flex items-center gap-2 text-left flex-1"
            >
              {exercise.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <div>
                <p className="font-semibold text-sm">{exercise.exerciseName}</p>
                <p className="text-xs text-slate-500">
                  {exercise.muscleGroup} · {exercise.sets.length} sets
                </p>
              </div>
            </button>
            <button
              onClick={() => removeExercise(exIdx)}
              className="p-2 text-slate-600 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {!exercise.collapsed && (
            <div className="px-3 py-2">
              {/* Header row */}
              <div className="grid grid-cols-[32px_1fr_1fr_1fr_48px] gap-1 mb-1 px-1">
                <span className="text-[10px] text-slate-600 text-center">SET</span>
                <span className="text-[10px] text-slate-600 text-center">PREV</span>
                <span className="text-[10px] text-slate-600 text-center">WEIGHT</span>
                <span className="text-[10px] text-slate-600 text-center">REPS</span>
                <span className="text-[10px] text-slate-600 text-center">RPE</span>
              </div>

              {exercise.sets.map((set, setIdx) => (
                <div
                  key={set.setNumber}
                  className="grid grid-cols-[32px_1fr_1fr_1fr_48px] gap-1 mb-1 items-center"
                >
                  <span className="text-center text-xs font-medium text-slate-500">
                    {set.setNumber}
                  </span>
                  <span className="text-center text-xs text-slate-600">
                    {set.targetWeight && set.targetReps
                      ? `${set.targetWeight}×${set.targetReps}`
                      : "—"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={set.actualWeight ?? ""}
                    onChange={(e) =>
                      updateSet(
                        exIdx,
                        setIdx,
                        "actualWeight",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="rounded-lg bg-slate-800 px-2 py-2 text-center text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={set.actualReps ?? ""}
                    onChange={(e) =>
                      updateSet(
                        exIdx,
                        setIdx,
                        "actualReps",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="rounded-lg bg-slate-800 px-2 py-2 text-center text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="—"
                    min={1}
                    max={10}
                    value={set.rpe ?? ""}
                    onChange={(e) =>
                      updateSet(
                        exIdx,
                        setIdx,
                        "rpe",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="rounded-lg bg-slate-800 px-2 py-2 text-center text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-slate-500 hover:text-indigo-400"
              >
                <Plus size={14} />
                Add Set
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowBrowser(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 py-4 text-sm text-slate-400 transition-colors hover:border-indigo-500 hover:text-indigo-400"
      >
        <Plus size={18} />
        Add Exercise
      </button>

      {showBrowser && (
        <ExerciseBrowser
          onSelect={addExercise}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}
