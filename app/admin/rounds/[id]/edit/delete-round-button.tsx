"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("rounds").delete().eq("id", roundId);
    router.push("/admin");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#9ab8a0]">Are you sure?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2 border border-[#2d5035] rounded-lg text-sm font-medium text-[#9ab8a0] hover:bg-[#2a4830] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 border border-red-800/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-900/20 transition-colors"
    >
      Delete Round
    </button>
  );
}
