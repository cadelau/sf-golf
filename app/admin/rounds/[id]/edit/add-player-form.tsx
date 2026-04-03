"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Profile = { id: string; display_name: string };
type Mode = "roster" | "guest";

export default function AddPlayerForm({
  roundId,
  availablePlayers,
}: {
  roundId: string;
  availablePlayers: Profile[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("roster");
  const [selectedId, setSelectedId] = useState<string>(
    availablePlayers[0]?.id ?? ""
  );
  const [guestName, setGuestName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddRoster() {
    if (!selectedId) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase.from("round_players").upsert(
      { round_id: roundId, player_id: selectedId, status: "confirmed" },
      { onConflict: "round_id,player_id" }
    );
    setAdding(false);
    if (err) setError(err.message);
    else router.refresh();
  }

  async function handleAddGuest() {
    const name = guestName.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase.from("round_players").insert({
      round_id: roundId,
      player_id: null,
      guest_name: name,
      status: "confirmed",
    });
    setAdding(false);
    if (err) {
      setError(err.message);
    } else {
      setGuestName("");
      router.refresh();
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#2d5035]">
      <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-3">
        Add Player Manually
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3 bg-[#1a3520] rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("roster")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "roster"
              ? "bg-[#2d5035] text-white"
              : "text-[#9ab8a0] hover:text-white"
          }`}
        >
          From Roster
        </button>
        <button
          type="button"
          onClick={() => setMode("guest")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "guest"
              ? "bg-[#2d5035] text-white"
              : "text-[#9ab8a0] hover:text-white"
          }`}
        >
          Guest / Alternate
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {mode === "roster" ? (
        availablePlayers.length === 0 ? (
          <p className="text-[#6a8870] text-sm">All roster players are already in this round.</p>
        ) : (
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
              onClick={handleAddRoster}
              disabled={adding || !selectedId}
              type="button"
              className="px-4 py-2 bg-[#2d5035] text-white rounded-lg text-sm font-medium hover:bg-[#3a6040] transition-colors disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Player"}
            </button>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGuest()}
            placeholder="Guest name"
            className="bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2 text-sm placeholder-[#6a8870] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
          />
          <button
            onClick={handleAddGuest}
            disabled={adding || !guestName.trim()}
            type="button"
            className="px-4 py-2 bg-[#2d5035] text-white rounded-lg text-sm font-medium hover:bg-[#3a6040] transition-colors disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Guest"}
          </button>
        </div>
      )}
    </div>
  );
}
