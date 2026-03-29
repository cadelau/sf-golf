"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CourseHole = { hole_number: number; par: number };

const DEFAULT_PARS = [4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 4, 3, 4, 5, 4, 3, 4, 5];

export default function HoleParEditor({
  courseId,
  initialHoles,
}: {
  courseId: string;
  initialHoles: CourseHole[];
}) {
  const supabase = createClient();

  function buildInitialPars(): Record<number, number> {
    const pars: Record<number, number> = {};
    for (let i = 1; i <= 18; i++) {
      const saved = initialHoles.find((h) => h.hole_number === i);
      pars[i] = saved?.par ?? DEFAULT_PARS[i - 1] ?? 4;
    }
    return pars;
  }

  const [pars, setPars] = useState<Record<number, number>>(buildInitialPars);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Object.values(pars).reduce((s, p) => s + p, 0);
  const front9Total = Array.from({ length: 9 }, (_, i) => i + 1).reduce(
    (s, h) => s + (pars[h] ?? 4),
    0
  );
  const back9Total = Array.from({ length: 9 }, (_, i) => i + 10).reduce(
    (s, h) => s + (pars[h] ?? 4),
    0
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    const rows = Array.from({ length: 18 }, (_, i) => ({
      course_id: courseId,
      hole_number: i + 1,
      par: pars[i + 1] ?? 4,
    }));
    const { error: err } = await supabase
      .from("course_holes")
      .upsert(rows, { onConflict: "course_id,hole_number" });
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const front9 = Array.from({ length: 9 }, (_, i) => i + 1);
  const back9 = Array.from({ length: 9 }, (_, i) => i + 10);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {[front9, back9].map((holes, halfIndex) => (
        <div key={halfIndex} className="overflow-x-auto">
          <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
            {halfIndex === 0 ? `Front 9 (${front9Total})` : `Back 9 (${back9Total})`}
          </p>
          <table className="text-sm border-collapse w-full min-w-max">
            <thead>
              <tr className="bg-[#1a3520]">
                <th className="border border-[#2d5035] px-3 py-2 text-left font-medium text-[#9ab8a0] w-16">
                  Hole
                </th>
                {holes.map((h) => (
                  <th
                    key={h}
                    className="border border-[#2d5035] px-2 py-2 text-center font-medium text-[#9ab8a0] w-12"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#2d5035] px-3 py-2 font-medium text-[#9ab8a0] bg-[#1a3520]">
                  Par
                </td>
                {holes.map((h) => (
                  <td key={h} className="border border-[#2d5035] px-1 py-1 bg-[#243d2a]">
                    <input
                      type="number"
                      value={pars[h] ?? 4}
                      onChange={(e) =>
                        setPars((prev) => ({
                          ...prev,
                          [h]: parseInt(e.target.value) || 4,
                        }))
                      }
                      min={3}
                      max={6}
                      className="w-full text-center text-sm bg-transparent text-white focus:outline-none focus:bg-[#1a3520] rounded py-1"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-[#9ab8a0]">
          Total par: <span className="font-bold text-white">{total}</span>
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          type="button"
          className="px-4 py-2 bg-[#d4af37] text-[#1a3520] rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Pars"}
        </button>
      </div>
    </div>
  );
}
