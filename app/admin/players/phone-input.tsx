"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PhoneInput({
  playerId,
  phone,
}: {
  playerId: string;
  phone: string | null;
}) {
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function save() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ phone: value.trim() || null })
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
    <div className="flex items-center gap-1.5">
      <input
        type="tel"
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder="—"
        className="w-32 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      {saving && <span className="text-xs text-gray-400">...</span>}
      {saved && <span className="text-xs text-green-600">✓</span>}
    </div>
  );
}
