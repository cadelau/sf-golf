import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SeasonManager from "./season-manager";

export default async function SeasonsAdminPage() {
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

  const [{ data: seasons }, { data: roundRows }] = await Promise.all([
    supabase
      .from("seasons")
      .select("*")
      .order("year", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("rounds").select("season_id"),
  ]);

  const roundCounts = new Map<string, number>();
  for (const r of roundRows ?? []) {
    roundCounts.set(r.season_id, (roundCounts.get(r.season_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-[#9ab8a0] mb-1">
          <Link href="/admin" className="hover:text-white transition-colors">
            Admin
          </Link>
          <span>›</span>
          <span>Seasons</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Manage Seasons</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">
          Start a new season when you&apos;re ready — activating it automatically archives
          the current one. Archived seasons stay visible to everyone via the season picker
          on Schedule and Standings.
        </p>
      </div>

      <SeasonManager
        seasons={(seasons ?? []).map((s) => ({
          ...s,
          roundCount: roundCounts.get(s.id) ?? 0,
        }))}
      />
    </div>
  );
}
