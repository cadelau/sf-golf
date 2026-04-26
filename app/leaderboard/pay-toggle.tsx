"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PayToggle({
  seasonId,
  playerId,
  initialPaid,
}: {
  seasonId: string;
  playerId: string;
  initialPaid: boolean;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("season_payments")
      .upsert(
        { season_id: seasonId, player_id: playerId, has_paid: !paid },
        { onConflict: "season_id,player_id" }
      );
    setPaid(!paid);
    setLoading(false);
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={`text-base font-bold transition-opacity ${loading ? "opacity-40" : "opacity-100"} ${
        paid ? "text-[#d4af37]" : "text-[#3d5c42] hover:text-[#6a8870]"
      }`}
      title={paid ? "Mark as unpaid" : "Mark as paid"}
    >
      $
    </button>
  );
}
