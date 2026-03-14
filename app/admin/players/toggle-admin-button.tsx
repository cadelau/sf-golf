"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ToggleAdminButton({
  playerId,
  isAdmin,
  isSelf,
}: {
  playerId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [admin, setAdmin] = useState(isAdmin);
  const supabase = createClient();
  const router = useRouter();

  async function toggle() {
    if (isSelf) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ is_admin: !admin })
      .eq("id", playerId);
    setAdmin((prev) => !prev);
    setLoading(false);
    router.refresh();
  }

  if (isSelf) {
    return (
      <span className="text-xs text-[#6a8870]">
        {admin ? "Admin (you)" : "—"}
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors border ${
        admin
          ? "bg-green-900/40 text-green-300 border-green-800/50 hover:bg-red-900/40 hover:text-red-300 hover:border-red-800/50"
          : "bg-[#1a3520] text-[#6a8870] border-[#2d5035] hover:bg-green-900/40 hover:text-green-300 hover:border-green-800/50"
      }`}
    >
      {loading ? "..." : admin ? "Admin ✕" : "Make admin"}
    </button>
  );
}
