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
      <span className="text-xs text-gray-400">
        {admin ? "Admin (you)" : "—"}
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
        admin
          ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800"
          : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800"
      }`}
    >
      {loading ? "..." : admin ? "Admin ✕" : "Make admin"}
    </button>
  );
}
