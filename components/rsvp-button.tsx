"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type RsvpStatus = "confirmed" | "waitlist" | "declined" | "tentative";

type Props = {
  roundId: string;
  playerId: string;
  currentStatus: RsvpStatus | null;
  maxPlayers: number;
  confirmedCount: number;
};

export default function RsvpButton({
  roundId,
  playerId,
  currentStatus,
  maxPlayers,
  confirmedCount,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RsvpStatus | null>(currentStatus);
  const router = useRouter();
  const supabase = createClient();

  async function handleRsvp(action: "in" | "tentative" | "out") {
    setLoading(true);
    try {
      if (action === "out") {
        await supabase
          .from("round_players")
          .upsert(
            { round_id: roundId, player_id: playerId, status: "declined" },
            { onConflict: "round_id,player_id" }
          );
        setStatus("declined");

        // Promote first person on waitlist
        const { data: waitlist } = await supabase
          .from("round_players")
          .select("id")
          .eq("round_id", roundId)
          .eq("status", "waitlist")
          .order("rsvp_at", { ascending: true })
          .limit(1);

        if (waitlist && waitlist.length > 0) {
          await supabase
            .from("round_players")
            .update({ status: "confirmed" })
            .eq("id", waitlist[0].id);
        }
      } else if (action === "tentative") {
        await supabase
          .from("round_players")
          .upsert(
            { round_id: roundId, player_id: playerId, status: "tentative" },
            { onConflict: "round_id,player_id" }
          );
        setStatus("tentative");
      } else {
        const newStatus =
          confirmedCount >= maxPlayers && status !== "confirmed"
            ? "waitlist"
            : "confirmed";
        await supabase
          .from("round_players")
          .upsert(
            { round_id: roundId, player_id: playerId, status: newStatus },
            { onConflict: "round_id,player_id" }
          );
        setStatus(newStatus);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isFull = confirmedCount >= maxPlayers && currentStatus !== "confirmed";

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {/* In */}
        <button
          onClick={() => handleRsvp("in")}
          disabled={loading}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors border-r border-gray-200 ${
            status === "confirmed" || status === "waitlist"
              ? "bg-green-700 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          ✓ {isFull && status !== "confirmed" ? "Waitlist" : "In"}
        </button>

        {/* Tentative */}
        <button
          onClick={() => handleRsvp("tentative")}
          disabled={loading}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors border-r border-gray-200 ${
            status === "tentative"
              ? "bg-yellow-400 text-yellow-900"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          ~ Maybe
        </button>

        {/* Out */}
        <button
          onClick={() => handleRsvp("out")}
          disabled={loading}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
            status === "declined"
              ? "bg-gray-700 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          ✕ Out
        </button>
      </div>

      {/* Status hint */}
      {status === "waitlist" && (
        <p className="text-xs text-orange-600 font-medium">
          Round is full — you&apos;re on the waitlist
        </p>
      )}
      {!status && (
        <p className="text-xs text-gray-400">Select an option above</p>
      )}
    </div>
  );
}
