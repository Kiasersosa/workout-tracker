"use client";

import { useState, useEffect, useMemo } from "react";
import { Ruler, Plus, Save, Check } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { db, type BodyMeasurement } from "@/lib/db";

const FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: "bodyWeight", label: "Body Weight", unit: "lb" },
  { key: "chest", label: "Chest", unit: "in" },
  { key: "waist", label: "Waist", unit: "in" },
  { key: "hips", label: "Hips", unit: "in" },
  { key: "leftBicep", label: "Left Bicep", unit: "in" },
  { key: "rightBicep", label: "Right Bicep", unit: "in" },
  { key: "leftThigh", label: "Left Thigh", unit: "in" },
  { key: "rightThigh", label: "Right Thigh", unit: "in" },
  { key: "neck", label: "Neck", unit: "in" },
];

export default function BodyPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [chartField, setChartField] = useState<keyof BodyMeasurement>("bodyWeight");

  useEffect(() => {
    db.bodyMeasurements.orderBy("date").toArray().then(setMeasurements);
  }, []);

  const handleSave = async () => {
    const date = new Date().toISOString().split("T")[0];
    const measurement: BodyMeasurement = {
      date,
      bodyWeight: form.bodyWeight ? parseFloat(form.bodyWeight) : null,
      chest: form.chest ? parseFloat(form.chest) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      hips: form.hips ? parseFloat(form.hips) : null,
      leftBicep: form.leftBicep ? parseFloat(form.leftBicep) : null,
      rightBicep: form.rightBicep ? parseFloat(form.rightBicep) : null,
      leftThigh: form.leftThigh ? parseFloat(form.leftThigh) : null,
      rightThigh: form.rightThigh ? parseFloat(form.rightThigh) : null,
      neck: form.neck ? parseFloat(form.neck) : null,
      syncedAt: null,
    };

    await db.bodyMeasurements.add(measurement);

    // Add to sync queue
    await db.syncQueue.add({
      type: "bodyMeasurement",
      action: "create",
      data: measurement as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      retries: 0,
    });

    setMeasurements((prev) => [...prev, measurement]);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      setForm({});
    }, 1500);
  };

  // Prefill form with last measurement values
  const openForm = () => {
    if (measurements.length > 0) {
      const last = measurements[measurements.length - 1];
      const prefill: Record<string, string> = {};
      FIELDS.forEach(({ key }) => {
        const val = last[key];
        if (val != null) prefill[key as string] = String(val);
      });
      setForm(prefill);
    }
    setShowForm(true);
  };

  // Chart data
  const chartData = useMemo(() => {
    return measurements
      .filter((m) => m[chartField] != null)
      .map((m) => ({
        date: new Date(m.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: m[chartField] as number,
      }));
  }, [measurements, chartField]);

  // Latest vs first change
  const change = useMemo(() => {
    const relevant = measurements.filter((m) => m[chartField] != null);
    if (relevant.length < 2) return null;
    const first = relevant[0][chartField] as number;
    const last = relevant[relevant.length - 1][chartField] as number;
    const diff = last - first;
    return { diff: Math.abs(diff).toFixed(1), direction: diff > 0 ? "up" : "down" };
  }, [measurements, chartField]);

  if (showForm) {
    return (
      <div className="flex flex-col px-4 pt-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Measurement</h1>
          <button
            onClick={() => setShowForm(false)}
            className="text-sm text-slate-400"
          >
            Cancel
          </button>
        </div>
        <p className="mb-6 text-xs text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="space-y-3">
          {FIELDS.map(({ key, label, unit }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <label className="flex-1 text-sm font-medium">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="—"
                  value={form[key as string] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-20 rounded-lg bg-slate-800 px-3 py-2 text-right text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="w-6 text-xs text-slate-500">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saved}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white transition-colors ${
            saved
              ? "bg-green-600"
              : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700"
          }`}
        >
          {saved ? (
            <>
              <Check size={20} />
              Saved
            </>
          ) : (
            <>
              <Save size={20} />
              Save Measurement
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Body</h1>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {measurements.length === 0 ? (
        <div className="flex flex-col items-center pt-12">
          <div className="mb-6 rounded-full bg-indigo-500/10 p-6">
            <Ruler size={48} className="text-indigo-400" />
          </div>
          <p className="mb-6 text-sm text-slate-400">
            Track your body measurements over time
          </p>
          <button
            onClick={openForm}
            className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Add First Measurement
          </button>
        </div>
      ) : (
        <>
          {/* Field selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {FIELDS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartField(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  chartField === key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400">
                  {FIELDS.find((f) => f.key === chartField)?.label}
                </h3>
                {change && (
                  <span
                    className={`text-xs font-medium ${
                      change.direction === "down" ? "text-green-400" : "text-yellow-400"
                    }`}
                  >
                    {change.direction === "up" ? "+" : "-"}
                    {change.diff}{" "}
                    {FIELDS.find((f) => f.key === chartField)?.unit}
                  </span>
                )}
              </div>
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
                    domain={["dataMin - 2", "dataMax + 2"]}
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
                    dataKey="value"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ fill: "#818cf8", r: 3 }}
                    name={FIELDS.find((f) => f.key === chartField)?.label}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : chartData.length === 1 ? (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-sm text-slate-400">
                Add one more measurement to see the chart
              </p>
            </div>
          ) : null}

          {/* Latest measurements */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-400">Latest</h3>
            </div>
            {FIELDS.map(({ key, label, unit }) => {
              const latest = measurements[measurements.length - 1];
              const val = latest[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3 last:border-0"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-medium">
                    {val != null ? `${val} ${unit}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
