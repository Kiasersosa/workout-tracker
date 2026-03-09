"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Target, Trash2, Plus, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import {
  getGoals,
  addGoal,
  deleteGoal,
  type Goal,
} from "@/lib/goals-db";
import { estimate1RM } from "@/lib/strength-score";
import exercises from "@/data/exercises.json";

export default function RoutinesPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    exerciseName: "",
    metric: "weight" as "weight" | "reps" | "e1rm",
    targetValue: "",
    targetDate: "",
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const g = await getGoals();

    // Auto-update current values from workout data
    const allSets = await db.workoutSets.toArray();
    for (const goal of g) {
      const relevantSets = allSets.filter(
        (s) => s.exerciseName === goal.exerciseName && s.actualWeight != null && s.actualReps != null
      );
      if (relevantSets.length === 0) continue;

      if (goal.metric === "weight") {
        goal.currentValue = Math.max(...relevantSets.map((s) => s.actualWeight!));
      } else if (goal.metric === "reps") {
        goal.currentValue = Math.max(...relevantSets.map((s) => s.actualReps!));
      } else if (goal.metric === "e1rm") {
        goal.currentValue = Math.max(
          ...relevantSets.map((s) => Math.round(estimate1RM(s.actualWeight!, s.actualReps!)))
        );
      }

      if (goal.currentValue >= goal.targetValue && goal.status === "active") {
        goal.status = "completed";
      }
    }

    setGoals(g);
  };

  const handleAddGoal = async () => {
    if (!goalForm.exerciseName || !goalForm.targetValue) return;

    await addGoal({
      exerciseName: goalForm.exerciseName,
      metric: goalForm.metric,
      currentValue: 0,
      targetValue: parseFloat(goalForm.targetValue),
      startDate: new Date().toISOString().split("T")[0],
      targetDate: goalForm.targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    });

    setGoalForm({ exerciseName: "", metric: "weight", targetValue: "", targetDate: "" });
    setShowAddGoal(false);
    loadGoals();
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id);
    loadGoals();
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const exerciseNames = [...new Set(exercises.map((e) => e.name))].sort();

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines & Goals</h1>
        <button
          onClick={() => setShowAddGoal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={16} />
          Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-semibold">New Goal</h3>

          {/* Exercise picker */}
          <select
            value={goalForm.exerciseName}
            onChange={(e) => setGoalForm((p) => ({ ...p, exerciseName: e.target.value }))}
            className="mb-3 w-full rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="">Select exercise...</option>
            {exerciseNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Metric */}
          <div className="mb-3 flex gap-2">
            {(["weight", "reps", "e1rm"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setGoalForm((p) => ({ ...p, metric: m }))}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  goalForm.metric === m
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {m === "e1rm" ? "Est. 1RM" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Target value */}
          <div className="mb-3 flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Target ${goalForm.metric === "reps" ? "reps" : "lb"}`}
              value={goalForm.targetValue}
              onChange={(e) => setGoalForm((p) => ({ ...p, targetValue: e.target.value }))}
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={goalForm.targetDate}
              onChange={(e) => setGoalForm((p) => ({ ...p, targetDate: e.target.value }))}
              className="rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddGoal(false)}
              className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAddGoal}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white"
            >
              Add Goal
            </button>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Target size={14} />
            Active Goals
          </h2>
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const progress = goal.targetValue > 0
                ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
                : 0;

              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{goal.exerciseName}</p>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-slate-600 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">
                    {goal.metric === "e1rm" ? "Est. 1RM" : goal.metric}: {goal.currentValue} → {goal.targetValue}
                    {goal.metric !== "reps" ? " lb" : ""}
                    {goal.targetDate && ` · by ${new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-indigo-400">{progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Trophy size={14} />
            Completed
          </h2>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3"
              >
                <Trophy size={16} className="text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{goal.exerciseName}</p>
                  <p className="text-xs text-slate-500">
                    {goal.metric}: {goal.targetValue}{goal.metric !== "reps" ? " lb" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-1 text-slate-600 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showAddGoal && (
        <div className="flex flex-col items-center pt-12">
          <div className="mb-6 rounded-full bg-indigo-500/10 p-6">
            <ClipboardList size={48} className="text-indigo-400" />
          </div>
          <p className="mb-2 text-sm text-slate-400">No goals set yet</p>
          <p className="text-xs text-slate-600">
            Set strength goals and track your progress
          </p>
        </div>
      )}
    </div>
  );
}
