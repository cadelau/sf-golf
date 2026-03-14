"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Course = { id: string; name: string; city: string; par: number };

export default function CreateRoundForm({
  seasonId,
  courses,
}: {
  seasonId: string;
  courses: Course[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCity, setNewCourseCity] = useState("");
  const [newCoursePar, setNewCoursePar] = useState("72");
  const [showNewCourse, setShowNewCourse] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      let courseId = data.get("course_id") as string;

      // Create new course if needed
      if (courseId === "new") {
        if (!newCourseName.trim()) {
          setError("Please enter a course name.");
          setLoading(false);
          return;
        }
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .insert({
            name: newCourseName.trim(),
            city: newCourseCity.trim(),
            par: parseInt(newCoursePar) || 72,
          })
          .select()
          .single();

        if (courseError) throw courseError;
        courseId = course.id;
      }

      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .insert({
          season_id: seasonId,
          course_id: courseId,
          date: data.get("date") as string,
          max_players: parseInt(data.get("max_players") as string) || 20,
          tee_start_time: data.get("tee_start_time") as string,
          tee_interval_minutes: parseInt(data.get("tee_interval_minutes") as string) || 8,
          notes: (data.get("notes") as string) || null,
        })
        .select()
        .single();

      if (roundError) throw roundError;
      router.push(`/admin/rounds/${round.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Course
        </label>
        <select
          name="course_id"
          required
          onChange={(e) => setShowNewCourse(e.target.value === "new")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Select a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.city ? `(${c.city})` : ""}
            </option>
          ))}
          <option value="new">+ Add new course</option>
        </select>
      </div>

      {showNewCourse && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            New Course
          </p>
          <input
            type="text"
            placeholder="Course name *"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="City (optional)"
            value={newCourseCity}
            onChange={(e) => setNewCourseCity(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Par:</label>
            <input
              type="number"
              value={newCoursePar}
              onChange={(e) => setNewCoursePar(e.target.value)}
              min={60}
              max={80}
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
        <input
          type="date"
          name="date"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            First Tee Time
          </label>
          <input
            type="time"
            name="tee_start_time"
            required
            defaultValue="08:00"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Interval (minutes)
          </label>
          <input
            type="number"
            name="tee_interval_minutes"
            defaultValue={8}
            min={5}
            max={20}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Max Players
        </label>
        <input
          type="number"
          name="max_players"
          defaultValue={20}
          min={1}
          max={100}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any details, special rules, directions..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Round"}
      </button>
    </form>
  );
}
