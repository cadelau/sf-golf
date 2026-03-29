"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Profile = { id: string; display_name: string };

export default function AddPlayerForm({
  roundId,
  availablePlayers,
}: {
  roundId: string;
  availablePlayers: Profile[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(
    availablePlayers[0]?.id ?? ""
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (availablePlayers.length === 0) return null;

  async function handleAdd() {
    if (!selectedId) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase.from("round_players").upsert(
      { round_id: roundId, player_id: selectedId, status: "confirmed" },
      { onConflict: "round_id,player_id" }
    );
    setAdding(false);
    if (err) {
      setError(err.message);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#2d5035]">
      <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
        Add Player Manually
      </p>
      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
        >
          {availablePlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={adding || !selectedId}
          type="button"
          className="px-4 py-2 bg-[#2d5035] text-white rounded-lg text-sm font-medium hover:bg-[#3a6040] transition-colors disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Player"}
        </button>
      </div>
    </div>
  );
}
