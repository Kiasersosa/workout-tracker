"use client";

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded bg-slate-800 ${i < lines - 1 ? "mb-3" : ""}`}
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-slate-800" />
      <div className="space-y-4">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} />
      </div>
    </div>
  );
}
