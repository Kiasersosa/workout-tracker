"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Check, Search, X } from "lucide-react";
import exercises from "@/data/exercises.json";

type Exercise = (typeof exercises)[number];

interface ExerciseBrowserProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

type Step = "muscle" | "equipment" | "exercise";

export default function ExerciseBrowser({ onSelect, onClose }: ExerciseBrowserProps) {
  const [step, setStep] = useState<Step>("muscle");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const muscleGroups = useMemo(
    () => [...new Set(exercises.map((e) => e.muscleGroup))].sort(),
    []
  );

  const equipmentForMuscle = useMemo(() => {
    if (!selectedMuscle) return [];
    return [
      ...new Set(
        exercises
          .filter((e) => e.muscleGroup === selectedMuscle)
          .map((e) => e.equipment)
      ),
    ].sort();
  }, [selectedMuscle]);

  const filteredExercises = useMemo(() => {
    if (search) {
      return exercises.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (!selectedMuscle || !selectedEquipment) return [];
    return exercises.filter(
      (e) =>
        e.muscleGroup === selectedMuscle && e.equipment === selectedEquipment
    );
  }, [selectedMuscle, selectedEquipment, search]);

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle);
    setStep("equipment");
  };

  const handleEquipmentSelect = (equipment: string) => {
    setSelectedEquipment(equipment);
    setStep("exercise");
  };

  const handleBack = () => {
    if (step === "exercise") {
      setSelectedEquipment(null);
      setStep("equipment");
    } else if (step === "equipment") {
      setSelectedMuscle(null);
      setStep("muscle");
    }
  };

  const title =
    step === "muscle"
      ? "Muscle Group"
      : step === "equipment"
        ? selectedMuscle
        : `${selectedMuscle} — ${selectedEquipment}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          {step !== "muscle" && !search && (
            <button
              onClick={handleBack}
              className="text-sm text-indigo-400"
            >
              Back
            </button>
          )}
          <h2 className="text-lg font-semibold">{search ? "Search" : title}</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {search ? (
          // Search results
          <div className="divide-y divide-slate-800/50">
            {filteredExercises.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No exercises found
              </p>
            ) : (
              filteredExercises.map((exercise) => (
                <button
                  key={exercise.name}
                  onClick={() => onSelect(exercise)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium">{exercise.name}</p>
                    <p className="text-xs text-slate-500">
                      {exercise.muscleGroup} · {exercise.equipment}
                    </p>
                  </div>
                  <Check size={18} className="text-indigo-400 opacity-0" />
                </button>
              ))
            )}
          </div>
        ) : step === "muscle" ? (
          // Muscle groups
          <div className="divide-y divide-slate-800/50">
            {muscleGroups.map((muscle) => {
              const count = exercises.filter(
                (e) => e.muscleGroup === muscle
              ).length;
              return (
                <button
                  key={muscle}
                  onClick={() => handleMuscleSelect(muscle)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors active:bg-slate-800"
                >
                  <div>
                    <p className="font-medium">{muscle}</p>
                    <p className="text-xs text-slate-500">{count} exercises</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              );
            })}
          </div>
        ) : step === "equipment" ? (
          // Equipment types
          <div className="divide-y divide-slate-800/50">
            {equipmentForMuscle.map((equipment) => {
              const count = exercises.filter(
                (e) =>
                  e.muscleGroup === selectedMuscle &&
                  e.equipment === equipment
              ).length;
              return (
                <button
                  key={equipment}
                  onClick={() => handleEquipmentSelect(equipment)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors active:bg-slate-800"
                >
                  <div>
                    <p className="font-medium">{equipment}</p>
                    <p className="text-xs text-slate-500">{count} exercises</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              );
            })}
          </div>
        ) : (
          // Exercises
          <div className="divide-y divide-slate-800/50">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.name}
                onClick={() => onSelect(exercise)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors active:bg-slate-800"
              >
                <div>
                  <p className="font-medium">{exercise.name}</p>
                  <p className="text-xs text-slate-500">
                    {exercise.movementType} · {exercise.difficulty}
                  </p>
                </div>
                <Check size={18} className="text-indigo-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
