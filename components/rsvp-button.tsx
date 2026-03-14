"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type RsvpStatus = "confirmed" | "waitlist" | "declined" | "tentative";

type Props = {
  roundId: string;
  playerId: string;
  currentStatus: RsvpStatus | null;
  maxPlayers: number | null;
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
        // No cap when maxPlayers is null — always confirm
        const isFull = maxPlayers !== null && confirmedCount >= maxPlayers && currentStatus !== "confirmed";
        const newStatus = isFull ? "waitlist" : "confirmed";
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

  const isFull = maxPlayers !== null && confirmedCount >= maxPlayers && currentStatus !== "confirmed";

  const buttons = [
    {
      action: "in" as const,
      emoji: "✅",
      label: isFull && status !== "confirmed" ? "Waitlist" : "In",
      active: status === "confirmed" || status === "waitlist",
      activeClass: "bg-green-700 border-green-600 text-white",
      inactiveClass: "border-[#2d5035] text-[#9ab8a0] hover:border-green-600 hover:text-green-400",
    },
    {
      action: "tentative" as const,
      emoji: "🤔",
      label: "Maybe",
      active: status === "tentative",
      activeClass: "bg-yellow-600 border-yellow-500 text-white",
      inactiveClass: "border-[#2d5035] text-[#9ab8a0] hover:border-yellow-500 hover:text-yellow-400",
    },
    {
      action: "out" as const,
      emoji: "❌",
      label: "Out",
      active: status === "declined",
      activeClass: "bg-red-700 border-red-600 text-white",
      inactiveClass: "border-[#2d5035] text-[#9ab8a0] hover:border-red-500 hover:text-red-400",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.action}
            onClick={() => handleRsvp(btn.action)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
              btn.active ? btn.activeClass : btn.inactiveClass
            }`}
          >
            <span>{btn.emoji}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
      {status === "waitlist" && (
        <p className="text-xs text-yellow-500 font-medium">
          Round is full — you&apos;re on the waitlist
        </p>
      )}
    </div>
  );
}
