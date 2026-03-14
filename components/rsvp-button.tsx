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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleRsvp("in")}
        disabled={loading || status === "confirmed"}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          status === "confirmed"
            ? "bg-green-700 text-white cursor-default"
            : "bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
        }`}
      >
        {status === "confirmed"
          ? "✓ I'm In"
          : status === "waitlist"
          ? "Rejoin"
          : confirmedCount >= maxPlayers
          ? "Join Waitlist"
          : "I'm In"}
      </button>

      <button
        onClick={() => handleRsvp("tentative")}
        disabled={loading || status === "tentative"}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          status === "tentative"
            ? "bg-yellow-400 text-yellow-900 cursor-default"
            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
        }`}
      >
        {status === "tentative" ? "~ Tentative" : "Tentative"}
      </button>

      <button
        onClick={() => handleRsvp("out")}
        disabled={loading || status === "declined"}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          status === "declined"
            ? "bg-gray-200 text-gray-500 cursor-default"
            : "border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        }`}
      >
        {status === "declined" ? "✗ Can't Make It" : "Can't Make It"}
      </button>

      {status === "waitlist" && (
        <span className="text-xs text-yellow-700 font-medium">On waitlist</span>
      )}
    </div>
  );
}
