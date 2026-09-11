"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Season } from "@/lib/types";

type SeasonRow = Season & { roundCount: number };

export default function SeasonManager({ seasons }: { seasons: SeasonRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a season name.");
      return;
    }
    setCreating(true);
    setError(null);
    const { error: insertError } = await supabase.from("seasons").insert({
      name: name.trim(),
      year: parseInt(year) || new Date().getFullYear(),
      is_active: false,
    });
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    router.refresh();
  }

  async function activate(id: string) {
    setBusyId(id);
    await supabase.from("seasons").update({ is_active: false }).neq("id", id);
    await supabase.from("seasons").update({ is_active: true }).eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  const inputClass =
    "w-full bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 placeholder-[#6a8870]";

  return (
    <div className="space-y-6">
      <form
        onSubmit={createSeason}
        className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6 space-y-4"
      >
        <h2 className="font-semibold text-white">Start a New Season</h2>
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#9ab8a0] mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fall 2026 Season"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9ab8a0] mb-1.5">
              Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-[#d4af37] text-[#1a3520] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Season"}
        </button>
      </form>

      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] divide-y divide-[#2d5035]">
        {seasons.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-white text-sm flex items-center gap-2">
                {s.name}
                {s.is_active && (
                  <span className="text-xs bg-green-900/40 text-green-300 border border-green-800/50 rounded-full px-2 py-0.5 font-medium">
                    Active
                  </span>
                )}
              </p>
              <p className="text-xs text-[#6a8870] mt-0.5">
                {s.year} · {s.roundCount} {s.roundCount === 1 ? "round" : "rounds"}
              </p>
            </div>
            {!s.is_active && (
              <button
                onClick={() => activate(s.id)}
                disabled={busyId === s.id}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#2d5035] text-[#9ab8a0] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-50"
              >
                {busyId === s.id ? "Activating..." : "Activate"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
