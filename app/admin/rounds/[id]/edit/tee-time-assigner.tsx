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
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Auto-assign groups
        </button>
        <button
          onClick={saveAssignments}
          disabled={saving}
          type="button"
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Assignments"}
        </button>
      </div>

      <div className="space-y-2">
        {confirmed.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
          >
            <span className="text-sm font-medium text-gray-800 flex-1">
              {player.display_name}
            </span>
            <select
              value={assignments[player.id] ?? ""}
              onChange={(e) =>
                setAssignments((prev) => ({
                  ...prev,
                  [player.id]: e.target.value,
                }))
              }
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Group Preview
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from(groups.entries())
            .filter(([t]) => t !== "unassigned")
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([teeTime, players], i) => (
              <div
                key={teeTime}
                className="bg-green-50 border border-green-100 rounded-lg p-3"
              >
                <p className="text-xs font-semibold text-green-800 mb-2">
                  {formatTime(teeTime)} — Group {i + 1}
                </p>
                <ul className="space-y-1">
                  {players.map((p) => (
                    <li key={p.id} className="text-sm text-gray-700">
                      {p.display_name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {groups.has("unassigned") && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Unassigned
              </p>
              <ul className="space-y-1">
                {groups.get("unassigned")!.map((p) => (
                  <li key={p.id} className="text-sm text-gray-500">
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
