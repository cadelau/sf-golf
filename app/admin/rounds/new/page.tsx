import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateRoundForm from "./form";

export default async function NewRoundPage() {
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

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">New Round</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">{season?.name}</p>
      </div>
      <CreateRoundForm seasonId={season?.id ?? ""} courses={courses ?? []} />
    </div>
  );
}
