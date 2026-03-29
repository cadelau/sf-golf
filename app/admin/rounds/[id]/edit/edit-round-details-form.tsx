"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Course = { id: string; name: string; city: string; par: number };
type Round = {
  id: string;
  course_id: string | null;
  date: string;
  tee_start_time: string | null;
  tee_interval_minutes: number;
  max_players: number | null;
  notes: string | null;
};

export default function EditRoundDetailsForm({
  round,
  courses,
}: {
  round: Round;
  courses: Course[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [courseId, setCourseId] = useState<string>(round.course_id ?? "tbd");
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCity, setNewCourseCity] = useState("");
  const [newCoursePar, setNewCoursePar] = useState("72");
  const [date, setDate] = useState(round.date);
  const [teeTbd, setTeeTbd] = useState(!round.tee_start_time);
  const [teeStartTime, setTeeStartTime] = useState(round.tee_start_time ?? "08:00");
  const [teeInterval, setTeeInterval] = useState(String(round.tee_interval_minutes));
  const [capacityTbd, setCapacityTbd] = useState(!round.max_players);
  const [maxPlayers, setMaxPlayers] = useState(String(round.max_players ?? 20));
  const [notes, setNotes] = useState(round.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 placeholder-[#6a8870]";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let resolvedCourseId: string | null = null;

      if (courseId !== "tbd") {
        if (courseId === "new") {
          if (!newCourseName.trim()) {
            setError("Please enter a course name.");
            setSaving(false);
            return;
          }
          const { data: newCourse, error: courseError } = await supabase
            .from("courses")
            .insert({ name: newCourseName.trim(), city: newCourseCity.trim(), par: parseInt(newCoursePar) || 72 })
            .select()
            .single();
          if (courseError) throw courseError;
          resolvedCourseId = newCourse.id;
        } else {
          resolvedCourseId = courseId;
        }
      }

      const { error: updateError } = await supabase
        .from("rounds")
        .update({
          course_id: resolvedCourseId,
          date,
          tee_start_time: teeTbd ? null : teeStartTime,
          tee_interval_minutes: parseInt(teeInterval) || 8,
          max_players: capacityTbd ? null : parseInt(maxPlayers) || 20,
          notes: notes.trim() || null,
        })
        .eq("id", round.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Course */}
      <div>
        <label className="block text-sm font-medium text-[#9ab8a0] mb-1.5">Course</label>
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setShowNewCourse(e.target.value === "new");
          }}
          className={inputClass}
        >
          <option value="tbd">Course TBD</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.city ? ` (${c.city})` : ""}
            </option>
          ))}
          <option value="new">+ Add new course</option>
        </select>
      </div>

      {showNewCourse && (
        <div className="bg-[#1a3520] rounded-lg p-4 space-y-3 border border-[#2d5035]">
          <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">New Course</p>
          <input type="text" placeholder="Course name *" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className={inputClass} />
          <input type="text" placeholder="City (optional)" value={newCourseCity} onChange={(e) => setNewCourseCity(e.target.value)} className={inputClass} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#9ab8a0]">Par:</label>
            <input type="number" value={newCoursePar} onChange={(e) => setNewCoursePar(e.target.value)} min={60} max={80} className="w-20 bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50" />
          </div>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-[#9ab8a0] mb-1.5">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>

      {/* Tee Times */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[#9ab8a0]">Tee Times</label>
          <label className="flex items-center gap-1.5 text-xs text-[#9ab8a0] cursor-pointer">
            <input type="checkbox" checked={teeTbd} onChange={(e) => setTeeTbd(e.target.checked)} className="accent-[#d4af37]" />
            TBD
          </label>
        </div>
        {!teeTbd && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input type="time" value={teeStartTime} onChange={(e) => setTeeStartTime(e.target.value)} className={inputClass} />
              <p className="text-xs text-[#6a8870] mt-1">First tee time</p>
            </div>
            <div>
              <input type="number" value={teeInterval} onChange={(e) => setTeeInterval(e.target.value)} min={5} max={20} className={inputClass} />
              <p className="text-xs text-[#6a8870] mt-1">Interval (minutes)</p>
            </div>
          </div>
        )}
      </div>

      {/* Max Players */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[#9ab8a0]">Max Players</label>
          <label className="flex items-center gap-1.5 text-xs text-[#9ab8a0] cursor-pointer">
            <input type="checkbox" checked={capacityTbd} onChange={(e) => setCapacityTbd(e.target.checked)} className="accent-[#d4af37]" />
            No limit
          </label>
        </div>
        {!capacityTbd && (
          <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} min={1} max={100} className={inputClass} />
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#9ab8a0] mb-1.5">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any details, special rules, directions..." className={inputClass + " resize-none"} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          type="button"
          className="px-5 py-2 bg-[#d4af37] text-[#1a3520] rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
