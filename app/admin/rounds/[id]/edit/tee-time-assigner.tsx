"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  player_id: string;
  display_name: string;
  tee_time: string | null;
  group_number: number | null;
  course_handicap: number | null;
};

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function TeeTimeAssigner({
  roundId,
  confirmed,
  teeStartTime,
  teeIntervalMinutes,
  maxPlayers,
}: {
  roundId: string;
  confirmed: Player[];
  teeStartTime: string;
  teeIntervalMinutes: number;
  maxPlayers: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(
      confirmed.map((p) => [p.id, p.tee_time ?? ""])
    )
  );
  const [handicaps, setHandicaps] = useState<Record<string, number | null>>(
    Object.fromEntries(
      confirmed.map((p) => [p.id, p.course_handicap ?? null])
    )
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Generate available tee times
  const numGroups = Math.ceil(maxPlayers / 4);
  const teeTimes: string[] = [];
  for (let i = 0; i < numGroups; i++) {
    teeTimes.push(addMinutes(teeStartTime, i * teeIntervalMinutes));
  }

  function autoAssign() {
    const newAssignments: Record<string, string> = {};
    confirmed.forEach((p, i) => {
      const groupIndex = Math.floor(i / 4);
      newAssignments[p.id] = teeTimes[groupIndex] ?? teeTimes[0];
    });
    setAssignments(newAssignments);
  }

  async function saveAssignments() {
    setSaving(true);
    try {
      for (const player of confirmed) {
        const teeTime = assignments[player.id];
        if (!teeTime) continue;

        const groupIndex = teeTimes.indexOf(teeTime);
        await supabase
          .from("round_players")
          .update({
            tee_time: teeTime,
            group_number: groupIndex + 1,
            course_handicap: handicaps[player.id] ?? null,
          })
          .eq("id", player.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Group by tee time for preview
  const groups = new Map<string, Player[]>();
  for (const player of confirmed) {
    const t = assignments[player.id] ?? "unassigned";
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(player);
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <button
          onClick={autoAssign}
          type="button"
          className="px-4 py-2 bg-[#1a3520] text-[#9ab8a0] border border-[#2d5035] rounded-lg text-sm font-medium hover:bg-[#2a4830] hover:text-white transition-colors"
        >
          Auto-assign groups
        </button>
        <button
          onClick={saveAssignments}
          disabled={saving}
          type="button"
          className="px-4 py-2 bg-[#d4af37] text-[#1a3520] rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Assignments"}
        </button>
      </div>

      <div className="space-y-2">
        {confirmed.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 py-2 px-3 bg-[#1a3520] rounded-lg border border-[#2d5035]"
          >
            <span className="text-sm font-medium text-white flex-1">
              {player.display_name}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#6a8870] whitespace-nowrap">HCP</label>
              <input
                type="number"
                value={handicaps[player.id] ?? ""}
                onChange={(e) =>
                  setHandicaps((prev) => ({
                    ...prev,
                    [player.id]: e.target.value === "" ? null : parseInt(e.target.value),
                  }))
                }
                min={0}
                max={54}
                placeholder="—"
                className="w-14 text-center text-sm bg-[#243d2a] border border-[#2d5035] text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              />
            </div>
            <select
              value={assignments[player.id] ?? ""}
              onChange={(e) =>
                setAssignments((prev) => ({
                  ...prev,
                  [player.id]: e.target.value,
                }))
              }
              className="bg-[#243d2a] border border-[#2d5035] text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
            >
              <option value="">No tee time</option>
              {teeTimes.map((t, i) => (
                <option key={t} value={t}>
                  {formatTime(t)} — Group {i + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Group Preview */}
      <div className="pt-4 border-t border-[#2d5035]">
        <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-3">
          Group Preview
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from(groups.entries())
            .filter(([t]) => t !== "unassigned")
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([teeTime, players], i) => (
              <div
                key={teeTime}
                className="bg-green-900/20 border border-green-800/30 rounded-lg p-3"
              >
                <p className="text-xs font-semibold text-green-300 mb-2">
                  {formatTime(teeTime)} — Group {i + 1}
                </p>
                <ul className="space-y-1">
                  {players.map((p) => (
                    <li key={p.id} className="text-sm text-white flex items-center justify-between">
                      <span>{p.display_name}</span>
                      {handicaps[p.id] !== null && handicaps[p.id] !== undefined && (
                        <span className="text-xs text-[#9ab8a0]">HCP {handicaps[p.id]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {groups.has("unassigned") && (
            <div className="bg-[#1a3520] border border-[#2d5035] rounded-lg p-3">
              <p className="text-xs font-semibold text-[#9ab8a0] mb-2">
                Unassigned
              </p>
              <ul className="space-y-1">
                {groups.get("unassigned")!.map((p) => (
                  <li key={p.id} className="text-sm text-[#6a8870]">
                    {p.display_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
