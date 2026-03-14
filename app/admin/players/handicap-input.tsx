"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function HandicapInput({
  playerId,
  handicap,
}: {
  playerId: string;
  handicap: number | null;
}) {
  const [value, setValue] = useState(handicap?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function save() {
    const parsed = value.trim() === "" ? null : parseFloat(value);
    if (parsed !== null && isNaN(parsed)) return;

    setSaving(true);
    await supabase
      .from("profiles")
      .update({ handicap: parsed })
      .eq("id", playerId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <input
        type="number"
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder="—"
        min={0}
        max={54}
        step={0.1}
        className="w-16 text-right bg-[#1a3520] border border-[#2d5035] text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 placeholder-[#4a6850]"
      />
      {saving && <span className="text-xs text-[#6a8870]">...</span>}
      {saved && <span className="text-xs text-[#d4af37]">✓</span>}
    </div>
  );
}
