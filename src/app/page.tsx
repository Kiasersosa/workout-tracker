"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Calendar, Brain } from "lucide-react";
import WorkoutSession from "@/components/WorkoutSession";
import CoachFeedback from "@/components/CoachFeedback";
import { getRecentWorkouts } from "@/lib/workout-helpers";

export default function WorkoutPage() {
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<
    { workoutId: string; date: string; workoutNumber: number; exerciseCount: number }[]
  >([]);

  // Refresh recent workouts when not in active session
  useEffect(() => {
    if (!activeWorkout) {
      getRecentWorkouts(5).then(setRecentWorkouts);
    }
  }, [activeWorkout]);

  const handleFinishWorkout = () => {
    setActiveWorkout(false);
    setShowCoach(true);
  };

  if (activeWorkout) {
    return <WorkoutSession onFinish={handleFinishWorkout} />;
  }

  return (
    <div className="flex flex-col px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Workout</h1>

      <div className="flex flex-col items-center pt-8">
        <div className="mb-6 rounded-full bg-indigo-500/10 p-6">
          <Dumbbell size={48} className="text-indigo-400" />
        </div>
        <p className="mb-6 text-sm text-slate-400">
          Track your sets, reps, and weight
        </p>
        <button
          onClick={() => setActiveWorkout(true)}
          className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
        >
          Start Workout
        </button>
        {recentWorkouts.length > 0 && (
          <button
            onClick={() => setShowCoach(true)}
            className="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-indigo-500 hover:text-indigo-400"
          >
            <Brain size={18} />
            AI Coach Analysis
          </button>
        )}
      </div>

      {recentWorkouts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Recent Workouts</h2>
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <div
                key={w.workoutId}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="rounded-lg bg-slate-800 p-2">
                  <Calendar size={18} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Workout #{w.workoutNumber}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(w.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {w.exerciseCount} exercise{w.exerciseCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCoach && <CoachFeedback onClose={() => setShowCoach(false)} />}
    </div>
  );
}
