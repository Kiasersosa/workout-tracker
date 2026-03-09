"use client";

import { useState, useEffect } from "react";
import { Brain, Loader2, Dumbbell, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  getTrainingPlan,
  saveTrainingPlan,
  getTrainerProfile,
  saveTrainerProfile,
  type TrainingPlan,
  type TrainerProfile,
  type WorkoutDay,
} from "@/lib/training-plan-db";
import { db } from "@/lib/db";

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT_OPTIONS = [
  "Full Gym",
  "Home Gym (Barbell + Rack)",
  "Dumbbells Only",
  "Bodyweight Only",
  "Gym — No Free Weights",
];

export default function TrainerPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [profile, setProfile] = useState<TrainerProfile>({
    goals: "",
    experienceLevel: "Beginner",
    daysPerWeek: 4,
    equipment: "Full Gym",
    injuries: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const existingPlan = await getTrainingPlan();
    if (existingPlan) setPlan(existingPlan);

    const existingProfile = await getTrainerProfile();
    if (existingProfile) {
      setProfile(existingProfile);
      if (!existingPlan) setShowForm(true);
    } else {
      setShowForm(true);
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setError(null);

    try {
      await saveTrainerProfile(profile);

      // Get recent workout data for context
      const allSets = await db.workoutSets.toArray();
      const recentSets = allSets.slice(-100).map((s) => ({
        date: s.date,
        exercise_name: s.exerciseName,
        actual_weight: String(s.actualWeight ?? ""),
        actual_reps: String(s.actualReps ?? ""),
        difficulty: String(s.rpe ?? ""),
      }));

      const lastBody = await db.bodyMeasurements.orderBy("date").last();

      const res = await fetch("/api/ai/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          goals: profile.goals,
          experienceLevel: profile.experienceLevel,
          daysPerWeek: profile.daysPerWeek,
          equipment: profile.equipment,
          injuries: profile.injuries,
          recentWorkouts: recentSets,
          bodyWeight: lastBody?.bodyWeight ? String(lastBody.bodyWeight) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      const data = await res.json();

      if (!data.plan || !Array.isArray(data.plan)) {
        throw new Error("AI did not return a valid training plan");
      }

      const newPlan: TrainingPlan = {
        overview: data.overview || "",
        days: data.plan,
        goals: profile.goals,
        createdAt: new Date().toISOString(),
        currentDayIndex: 0,
      };

      await saveTrainingPlan(newPlan);
      setPlan(newPlan);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayNum: number) => {
    setExpandedDay(expandedDay === dayNum ? null : dayNum);
  };

  // No plan and no form — show setup prompt
  if (!plan && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16">
        <div className="mb-8 rounded-full bg-indigo-500/10 p-6">
          <Brain size={48} className="text-indigo-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">AI Trainer</h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Get a personalized training program built by AI
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white"
        >
          Set Up My Program
        </button>
      </div>
    );
  }

  // Show goal/profile form
  if (showForm) {
    return (
      <div className="flex flex-col px-4 pt-6 pb-24">
        <h1 className="mb-2 text-2xl font-bold">AI Trainer</h1>
        <p className="mb-6 text-sm text-slate-400">
          Tell me about yourself and your goals
        </p>

        {/* Goals */}
        <label className="mb-1 text-xs font-medium text-slate-400">
          What are your goals?
        </label>
        <textarea
          value={profile.goals}
          onChange={(e) => setProfile((p) => ({ ...p, goals: e.target.value }))}
          placeholder="e.g., Build muscle and strength, focus on upper body, improve bench press to 225lb, lose body fat while maintaining muscle..."
          rows={4}
          className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />

        {/* Experience */}
        <label className="mb-1 text-xs font-medium text-slate-400">
          Experience Level
        </label>
        <div className="mb-4 flex gap-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setProfile((p) => ({ ...p, experienceLevel: level }))}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                profile.experienceLevel === level
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Days per week */}
        <label className="mb-1 text-xs font-medium text-slate-400">
          Days per Week
        </label>
        <div className="mb-4 flex gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setProfile((p) => ({ ...p, daysPerWeek: n }))}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                profile.daysPerWeek === n
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Equipment */}
        <label className="mb-1 text-xs font-medium text-slate-400">
          Equipment Available
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq}
              onClick={() => setProfile((p) => ({ ...p, equipment: eq }))}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                profile.equipment === eq
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {eq}
            </button>
          ))}
        </div>

        {/* Injuries */}
        <label className="mb-1 text-xs font-medium text-slate-400">
          Injuries or Limitations (optional)
        </label>
        <textarea
          value={profile.injuries}
          onChange={(e) => setProfile((p) => ({ ...p, injuries: e.target.value }))}
          placeholder="e.g., Bad left shoulder, lower back issues, knee pain during squats..."
          rows={2}
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />

        {error && (
          <p className="mb-4 text-center text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={generatePlan}
          disabled={loading || !profile.goals}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Brain size={20} />
              Generate My Training Plan
            </>
          )}
        </button>

        {plan && (
          <button
            onClick={() => setShowForm(false)}
            className="mt-3 w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-400"
          >
            Cancel — Keep Current Plan
          </button>
        )}
      </div>
    );
  }

  // Show the plan
  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Program</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300"
        >
          <RefreshCw size={14} />
          New Plan
        </button>
      </div>

      {/* Overview */}
      {plan!.overview && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-300 leading-relaxed">{plan!.overview}</p>
        </div>
      )}

      {/* Current day indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-xs text-slate-400">
          Next up: Day {(plan!.currentDayIndex % plan!.days.length) + 1} —{" "}
          {plan!.days[plan!.currentDayIndex % plan!.days.length]?.day_name}
        </span>
      </div>

      {/* Workout days */}
      <div className="space-y-3">
        {plan!.days.map((day) => {
          const isNext =
            day.day_number ===
            plan!.days[plan!.currentDayIndex % plan!.days.length]?.day_number;
          const isExpanded = expandedDay === day.day_number;

          return (
            <div
              key={day.day_number}
              className={`rounded-xl border overflow-hidden ${
                isNext
                  ? "border-indigo-500/30 bg-indigo-500/5"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <button
                onClick={() => toggleDay(day.day_number)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      isNext
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    D{day.day_number}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{day.day_name}</p>
                    <p className="text-xs text-slate-500">
                      {day.exercises.length} exercises
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-slate-500" />
                ) : (
                  <ChevronDown size={16} className="text-slate-500" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-800 px-4 py-2">
                  {day.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2.5 border-b border-slate-800/50 last:border-0"
                    >
                      <Dumbbell size={14} className="text-slate-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ex.exercise_name}
                        </p>
                        <p className="text-xs text-indigo-400">
                          {ex.sets} × {ex.reps} @ {ex.weight}lb
                        </p>
                        {ex.notes && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
