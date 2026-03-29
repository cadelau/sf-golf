import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import HoleParEditor from "./hole-par-editor";

export default async function CoursesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  const { data: courses } = await supabase
    .from("courses")
    .select("*, course_holes(*)")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-[#9ab8a0] mb-1">
          <Link href="/admin" className="hover:text-white transition-colors">
            Admin
          </Link>
          <span>›</span>
          <span>Courses</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Manage Courses</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">
          Set the par for each hole. These values are used across all rounds for that course.
        </p>
      </div>

      {(courses?.length ?? 0) === 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <p className="text-[#6a8870] text-sm">
            No courses yet. Create one when scheduling a round.
          </p>
        </div>
      )}

      {courses?.map((course) => (
        <div
          key={course.id}
          className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6"
        >
          <div className="mb-4">
            <h2 className="font-semibold text-white text-lg">{course.name}</h2>
            {course.city && (
              <p className="text-sm text-[#9ab8a0]">{course.city}</p>
            )}
          </div>
          <HoleParEditor
            courseId={course.id}
            initialHoles={course.course_holes ?? []}
          />
        </div>
      ))}
    </div>
  );
}
