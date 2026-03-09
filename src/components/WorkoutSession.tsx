"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import ExerciseBrowser from "./ExerciseBrowser";
import {
  createWorkoutId,
  getNextWorkoutNumber,
  saveWorkoutSet,
} from "@/lib/workout-helpers";
import {
  getNextWorkoutDay,
  advanceWorkoutDay,
  updatePlanWeights,
  type WorkoutDay,
  type PlannedExercise,
} from "@/lib/training-plan-db";
import { haptic } from "@/lib/haptics";
import type { WorkoutSet } from "@/lib/db";

const DIFFICULTY_OPTIONS = ["Easy", "Moderate", "Hard", "Impossible"];
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-600 text-white",
  Moderate: "bg-yellow-600 text-white",
  Hard: "bg-orange-600 text-white",
  Impossible: "bg-red-600 text-white",
};

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
  difficulty: string | null;
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
  const [plannedDay, setPlannedDay] = useState<WorkoutDay | null>(null);

  useEffect(() => {
    getNextWorkoutNumber().then(setWorkoutNumber);
    loadPlannedWorkout();
  }, []);

  const loadPlannedWorkout = async () => {
    const day = await getNextWorkoutDay();
    if (day) {
      setPlannedDay(day);
      const entries: ExerciseEntry[] = day.exercises.map((ex) => ({
        exerciseName: ex.exercise_name,
        muscleGroup: ex.muscle_group || "",
        equipment: "",
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          targetReps: ex.reps,
          targetWeight: ex.weight,
          actualReps: null,
          actualWeight: ex.weight, // prefill with target
          difficulty: null,
        })),
        collapsed: false,
      }));
      setExercises(entries);
    }
  };

  const addExercise = useCallback(
    (exercise: { name: string; muscleGroup: string; equipment: string }) => {
      setExercises((prev) => [
        ...prev,
        {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          sets: [1, 2, 3].map((n) => ({
            setNumber: n,
            targetReps: null,
            targetWeight: null,
            actualReps: null,
            actualWeight: null,
            difficulty: null,
          })),
          collapsed: false,
        },
      ]);
      setShowBrowser(false);
    },
    []
  );

  const updateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: keyof SetRow, value: number | string | null) => {
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
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets = [
        ...exercise.sets,
        {
          setNumber: exercise.sets.length + 1,
          targetReps: lastSet?.targetReps ?? null,
          targetWeight: lastSet?.targetWeight ?? null,
          actualReps: null,
          actualWeight: lastSet?.targetWeight ?? null,
          difficulty: null,
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

  // Auto-save to IndexedDB
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
            rpe: set.difficulty === "Easy" ? 5 : set.difficulty === "Moderate" ? 7 : set.difficulty === "Hard" ? 9 : set.difficulty === "Impossible" ? 10 : null,
            notes: set.difficulty || "",
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

  const handleFinish = async () => {
    haptic("heavy");

    // Adjust plan weights based on difficulty feedback
    if (plannedDay) {
      const updatedExercises: PlannedExercise[] = plannedDay.exercises.map((planEx) => {
        const sessionEx = exercises.find((e) => e.exerciseName === planEx.exercise_name);
        if (!sessionEx) return planEx;

        // Check dominant difficulty across sets
        const difficulties = sessionEx.sets
          .map((s) => s.difficulty)
          .filter(Boolean) as string[];

        if (difficulties.length === 0) return planEx;

        const counts: Record<string, number> = {};
        difficulties.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

        const isLower = ["Quads", "Hamstrings", "Glutes", "Calves"].includes(
          planEx.muscle_group || ""
        );
        const increment = isLower ? 10 : 5;

        let newWeight = planEx.weight;
        if (dominant === "Easy") {
          newWeight = planEx.weight + increment;
        } else if (dominant === "Impossible") {
          newWeight = Math.round(planEx.weight * 0.9);
        }
        // Moderate and Hard keep the same weight

        return { ...planEx, weight: newWeight };
      });

      await updatePlanWeights(plannedDay.day_number, updatedExercises);
      await advanceWorkoutDay();
    }

    onFinish();
  };

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {plannedDay ? plannedDay.day_name : `Workout #${workoutNumber}`}
          </h1>
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
          onClick={handleFinish}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
        >
          <Check size={16} />
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
                  {exercise.sets.length} sets
                  {exercise.sets[0]?.targetWeight
                    ? ` · ${exercise.sets[0].targetWeight}lb × ${exercise.sets[0].targetReps}`
                    : ""}
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
              <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-1 mb-1 px-1">
                <span className="text-[10px] text-slate-600 text-center">SET</span>
                <span className="text-[10px] text-slate-600 text-center">WEIGHT</span>
                <span className="text-[10px] text-slate-600 text-center">REPS</span>
                <span className="text-[10px] text-slate-600 text-center">FEEL</span>
              </div>

              {exercise.sets.map((set, setIdx) => (
                <div key={set.setNumber} className="mb-1">
                  <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-1 items-center">
                    <span className="text-center text-xs font-medium text-slate-500">
                      {set.setNumber}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={set.targetWeight ? String(set.targetWeight) : "0"}
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
                      placeholder={set.targetReps ? String(set.targetReps) : "0"}
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
                    {/* Difficulty selector */}
                    <select
                      value={set.difficulty ?? ""}
                      onChange={(e) => {
                        haptic("light");
                        updateSet(exIdx, setIdx, "difficulty", e.target.value || null);
                      }}
                      className={`rounded-lg px-1 py-2 text-center text-xs font-medium outline-none ${
                        set.difficulty
                          ? DIFFICULTY_COLORS[set.difficulty]
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      <option value="">—</option>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
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
