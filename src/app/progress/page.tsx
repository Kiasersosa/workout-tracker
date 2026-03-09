"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Dumbbell, ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { db, type WorkoutSet } from "@/lib/db";
import {
  estimate1RM,
  calculateOverallScore,
  getStrengthTier,
  getTierColor,
} from "@/lib/strength-score";

interface ChartPoint {
  date: string;
  weight: number;
  reps: number;
  e1rm: number;
}

export default function ProgressPage() {
  const [allSets, setAllSets] = useState<WorkoutSet[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [bodyWeight, setBodyWeight] = useState(170); // default

  useEffect(() => {
    db.workoutSets.toArray().then(setAllSets);
    // Try to get latest body weight
    db.bodyMeasurements
      .orderBy("date")
      .last()
      .then((m) => {
        if (m?.bodyWeight) setBodyWeight(m.bodyWeight);
      });
  }, []);

  // Unique exercises that have actual data
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    allSets.forEach((s) => {
      if (s.actualWeight && s.actualReps) names.add(s.exerciseName);
    });
    return [...names].sort();
  }, [allSets]);

  // Auto-select first exercise
  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  // Chart data for selected exercise
  const chartData = useMemo((): ChartPoint[] => {
    if (!selectedExercise) return [];

    const sets = allSets
      .filter(
        (s) =>
          s.exerciseName === selectedExercise &&
          s.actualWeight != null &&
          s.actualReps != null
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by date, take best set per day
    const byDate = new Map<string, { weight: number; reps: number; e1rm: number }>();
    for (const s of sets) {
      const e1rm = estimate1RM(s.actualWeight!, s.actualReps!);
      const existing = byDate.get(s.date);
      if (!existing || e1rm > existing.e1rm) {
        byDate.set(s.date, {
          weight: s.actualWeight!,
          reps: s.actualReps!,
          e1rm: Math.round(e1rm),
        });
      }
    }

    return [...byDate.entries()].map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...data,
    }));
  }, [allSets, selectedExercise]);

  // Strength score
  const strengthScore = useMemo(() => {
    // Get best set per exercise
    const bestSets = new Map<string, { weight: number; reps: number }>();
    for (const s of allSets) {
      if (s.actualWeight == null || s.actualReps == null) continue;
      const e1rm = estimate1RM(s.actualWeight, s.actualReps);
      const existing = bestSets.get(s.exerciseName);
      if (!existing || estimate1RM(existing.weight, existing.reps) < e1rm) {
        bestSets.set(s.exerciseName, { weight: s.actualWeight, reps: s.actualReps });
      }
    }

    const exerciseMaxes = [...bestSets.entries()].map(([name, data]) => ({
      exerciseName: name,
      weight: data.weight,
      reps: data.reps,
    }));

    return calculateOverallScore(exerciseMaxes, bodyWeight);
  }, [allSets, bodyWeight]);

  if (allSets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16">
        <div className="mb-8 rounded-full bg-indigo-500/10 p-6">
          <TrendingUp size={48} className="text-indigo-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Progress</h1>
        <p className="text-sm text-slate-400">
          Complete workouts to see your progress charts
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Progress</h1>

      {/* Strength Score Card */}
      {strengthScore.exercises.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400">Strength Score</h2>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getTierColor(strengthScore.overall)}`}>
                {strengthScore.overall}
              </span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <div className="mb-2 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 transition-all"
              style={{ width: `${strengthScore.overall}%` }}
            />
          </div>
          <p className={`text-xs font-medium ${getTierColor(strengthScore.overall)}`}>
            {getStrengthTier(strengthScore.overall)}
          </p>

          {/* Per-exercise scores */}
          <div className="mt-4 space-y-2">
            {strengthScore.exercises
              .sort((a, b) => b.score - a.score)
              .map((ex) => (
                <div key={ex.name} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-xs text-slate-400">{ex.name}</span>
                  <span className="text-xs text-slate-500">e1RM: {Math.round(ex.e1rm)}lb</span>
                  <span className={`text-xs font-medium ${getTierColor(ex.score)} w-8 text-right`}>
                    {ex.score}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Exercise Selector */}
      <div className="mb-4">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-indigo-400" />
            <span className="text-sm font-medium">
              {selectedExercise || "Select exercise"}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${showPicker ? "rotate-180" : ""}`}
          />
        </button>
        {showPicker && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 no-scrollbar">
            {exerciseNames.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setSelectedExercise(name);
                  setShowPicker(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  name === selectedExercise
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weight Chart */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-400">
            Weight Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#818cf8"
                strokeWidth={2}
                dot={{ fill: "#818cf8", r: 3 }}
                name="Weight (lb)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Estimated 1RM Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-400">
            Estimated 1RM Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: "#34d399", r: 3 }}
                name="Est. 1RM (lb)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
