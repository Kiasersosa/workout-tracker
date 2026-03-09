"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, Send, Loader2, Dumbbell, ChevronDown, ChevronUp, RefreshCw, MessageCircle } from "lucide-react";
import {
  getTrainingPlan,
  saveTrainingPlan,
  type TrainingPlan,
  type WorkoutDay,
} from "@/lib/training-plan-db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function TrainerPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [view, setView] = useState<"plan" | "chat">("plan");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadPlan = async () => {
    const existing = await getTrainingPlan();
    if (existing) {
      setPlan(existing);
      setView("plan");
    } else {
      startNewChat();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setView("chat");
    // Send initial greeting after a tick so UI renders first
    setTimeout(() => sendInitialGreeting(), 100);
  };

  const sendInitialGreeting = async () => {
    setLoading(true);
    try {
      const initialMessages: ChatMessage[] = [
        { role: "user", content: "Hi, I'd like help creating a workout plan." },
      ];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initialMessages }),
      });

      if (!res.ok) throw new Error("Failed to connect to AI coach");

      const data = await res.json();
      setMessages([
        { role: "assistant", content: data.text },
      ]);
    } catch {
      setMessages([
        {
          role: "assistant",
          content: "Hey! I'm your AI coach. Tell me about your fitness goals and I'll build you a personalized training program. What are you looking to achieve?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text },
      ]);

      // If a plan was generated, save it
      if (data.plan && Array.isArray(data.plan)) {
        const newPlan: TrainingPlan = {
          overview: data.text.split("\n").slice(0, 3).join(" ").substring(0, 300),
          days: data.plan,
          goals: messages.find((m) => m.role === "user")?.content || "",
          createdAt: new Date().toISOString(),
          currentDayIndex: 0,
        };
        await saveTrainingPlan(newPlan);
        setPlan(newPlan);

        // After a moment, switch to plan view
        setTimeout(() => setView("plan"), 2000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleDay = (dayNum: number) => {
    setExpandedDay(expandedDay === dayNum ? null : dayNum);
  };

  // Chat view
  if (view === "chat") {
    return (
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-indigo-400" />
            <h1 className="text-lg font-semibold">AI Coach</h1>
          </div>
          {plan && (
            <button
              onClick={() => setView("plan")}
              className="text-sm text-indigo-400"
            >
              View Plan
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-32">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {msg.content.split("\n").map((line, j) => (
                  <p key={j} className={`text-sm ${j > 0 ? "mt-2" : ""}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="rounded-2xl bg-slate-800 px-4 py-3">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="fixed bottom-16 left-0 right-0 border-t border-slate-800 bg-slate-950 px-4 py-3 pb-safe">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell your coach..."
              rows={1}
              className="flex-1 resize-none rounded-xl bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-indigo-600 p-3 text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Plan view
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16">
        <div className="mb-8 rounded-full bg-indigo-500/10 p-6">
          <Brain size={48} className="text-indigo-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">AI Trainer</h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Chat with your AI coach to build a personalized training program
        </p>
        <button
          onClick={startNewChat}
          className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white"
        >
          Talk to Coach
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Program</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("chat")}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300"
          >
            <MessageCircle size={14} />
            Chat
          </button>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300"
          >
            <RefreshCw size={14} />
            New Plan
          </button>
        </div>
      </div>

      {/* Overview */}
      {plan.overview && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-300 leading-relaxed">{plan.overview}</p>
        </div>
      )}

      {/* Current day indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-xs text-slate-400">
          Next up: Day {(plan.currentDayIndex % plan.days.length) + 1} —{" "}
          {plan.days[plan.currentDayIndex % plan.days.length]?.day_name}
        </span>
      </div>

      {/* Workout days */}
      <div className="space-y-3">
        {plan.days.map((day) => {
          const isNext =
            day.day_number ===
            plan.days[plan.currentDayIndex % plan.days.length]?.day_number;
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
                          {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
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
