"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Props = {
  roundId: string;
  playerId: string;
  currentStatus: "confirmed" | "waitlist" | "declined" | null;
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
  const [status, setStatus] = useState<"confirmed" | "waitlist" | "declined" | null>(currentStatus);
  const router = useRouter();
  const supabase = createClient();

  async function handleRsvp(action: "in" | "out") {
    setLoading(true);
    try {
      if (action === "out") {
        // Declining
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
      } else {
        // Going in
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

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleRsvp("in")}
        disabled={loading || status === "confirmed"}
        className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
          status === "confirmed"
            ? "bg-green-700 text-white cursor-default"
            : "bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
        }`}
      >
        {status === "confirmed"
          ? "✓ You're in"
          : status === "waitlist"
          ? "Rejoin"
          : confirmedCount >= maxPlayers
          ? "Join Waitlist"
          : "I'm In"}
      </button>
      {status !== "declined" && (
        <button
          onClick={() => handleRsvp("out")}
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Can't make it
        </button>
      )}
      {status === "waitlist" && (
        <span className="text-xs text-yellow-700 font-medium">On waitlist</span>
      )}
    </div>
  );
}
