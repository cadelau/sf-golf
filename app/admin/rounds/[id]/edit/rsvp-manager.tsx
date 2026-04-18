"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Rsvp = {
  id: string;
  player_id: string | null;
  status: string;
  display_name: string;
  is_guest: boolean;
};

const STATUS_OPTIONS = ["confirmed", "tentative", "waitlist", "declined"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const statusStyles: Record<Status, string> = {
  confirmed: "bg-green-900/40 text-green-300 border-green-800/50",
  tentative: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50",
  waitlist: "bg-orange-900/40 text-orange-300 border-orange-800/50",
  declined: "bg-[#243d2a] text-[#6a8870] border-[#2d5035]",
};

export default function RsvpManager({
  initialRsvps,
}: {
  initialRsvps: Rsvp[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(rsvp: Rsvp, newStatus: Status) {
    setBusy(rsvp.id);
    setError(null);
    const { error: err } = await supabase
      .from("round_players")
      .update({ status: newStatus })
      .eq("id", rsvp.id);
    setBusy(null);
    if (err) setError(err.message);
    else router.refresh();
  }

  async function removePlayer(rsvp: Rsvp) {
    setBusy(rsvp.id);
    setError(null);
    const { error: err } = await supabase
      .from("round_players")
      .delete()
      .eq("id", rsvp.id);
    setBusy(null);
    if (err) setError(err.message);
    else router.refresh();
  }

  if (initialRsvps.length === 0) {
    return <p className="text-[#6a8870] text-sm">No RSVPs yet.</p>;
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {initialRsvps.map((rsvp) => (
        <div
          key={rsvp.id}
          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#1a3520] flex-wrap"
        >
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium border shrink-0 ${
              statusStyles[(rsvp.status as Status) ?? "declined"]
            }`}
          >
            {rsvp.status}
          </span>

          <span className="text-sm text-white flex-1 min-w-0 truncate">
            {rsvp.display_name}
          </span>

          {rsvp.is_guest && (
            <span className="text-xs text-[#d4af37] border border-[#d4af37]/40 rounded-full px-2 py-0.5 shrink-0">
              Guest
            </span>
          )}

          <select
            disabled={busy === rsvp.id}
            value={rsvp.status}
            onChange={(e) => changeStatus(rsvp, e.target.value as Status)}
            className="bg-[#243d2a] border border-[#2d5035] text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            disabled={busy === rsvp.id}
            onClick={() => removePlayer(rsvp)}
            type="button"
            className="text-[#6a8870] hover:text-red-400 transition-colors text-xs font-medium px-1.5 py-0.5 rounded disabled:opacity-50"
            title="Remove from round"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
