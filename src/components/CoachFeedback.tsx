"use client";

import { useState } from "react";
import { X, Brain, Loader2, Dumbbell, TrendingUp, AlertCircle } from "lucide-react";

interface RoutineItem {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  progression_note: string;
}

interface CoachFeedbackProps {
  onClose: () => void;
}

export default function CoachFeedback({ onClose }: CoachFeedbackProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [routine, setRoutine] = useState<RoutineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requestAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setRoutine(data.routine || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Parse markdown-ish analysis into sections
  const renderAnalysis = (text: string) => {
    // Remove the JSON block from display
    const cleanText = text.replace(/```json[\s\S]*?```/g, "").trim();

    return cleanText.split("\n").map((line, i) => {
      if (line.startsWith("## ") || line.startsWith("**")) {
        return (
          <p key={i} className="mt-4 mb-1 text-sm font-semibold text-indigo-400">
            {line.replace(/^##\s*/, "").replace(/\*\*/g, "")}
          </p>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <p key={i} className="ml-2 text-sm text-slate-300">
            {line}
          </p>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="text-sm text-slate-300">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-indigo-400" />
          <h2 className="text-lg font-semibold">AI Coach</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {!analysis && !loading && !error && (
          <div className="flex flex-col items-center pt-12">
            <div className="mb-6 rounded-full bg-indigo-500/10 p-6">
              <Brain size={48} className="text-indigo-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Workout Analysis</h3>
            <p className="mb-8 text-center text-sm text-slate-400">
              Claude will analyze your recent workouts and recommend
              progressive adjustments for your next session.
            </p>
            <button
              onClick={requestAnalysis}
              className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            >
              Analyze My Workouts
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center pt-16">
            <Loader2 size={40} className="mb-4 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Analyzing your workouts...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center pt-12">
            <div className="mb-4 rounded-full bg-red-500/10 p-4">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <p className="mb-2 text-sm font-medium text-red-400">{error}</p>
            <button
              onClick={requestAnalysis}
              className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {analysis && (
          <>
            {/* Analysis text */}
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
              {renderAnalysis(analysis)}
            </div>

            {/* Next workout routine */}
            {routine.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-semibold">Next Workout Plan</h3>
                </div>
                <div className="space-y-2">
                  {routine.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Dumbbell size={14} className="text-slate-500" />
                        <p className="text-sm font-medium">{r.exercise_name}</p>
                      </div>
                      <p className="mt-1 text-xs text-indigo-400">
                        {r.target_sets} sets × {r.target_reps} reps @ {r.target_weight}lb
                      </p>
                      {r.progression_note && (
                        <p className="mt-1 text-xs text-slate-500">
                          {r.progression_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
