"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ToggleViewerButton({
  playerId,
  viewerOnly,
  isSelf,
}: {
  playerId: string;
  viewerOnly: boolean;
  isSelf: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ viewer_only: !viewerOnly })
      .eq("id", playerId);
    setLoading(false);
    router.refresh();
  }

  if (isSelf) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        viewerOnly
          ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 hover:bg-[#d4af37]/30"
          : "bg-[#2d5035] text-[#9ab8a0] border border-[#3a6040] hover:bg-[#3a6040] hover:text-white"
      }`}
    >
      {loading ? "..." : viewerOnly ? "Promote to Member" : "Set as Viewer"}
    </button>
  );
}
