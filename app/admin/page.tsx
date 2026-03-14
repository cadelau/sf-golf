import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const today = new Date().toISOString().split("T")[0];

  const { count: upcomingCount } = await supabase
    .from("rounds")
    .select("*", { count: "exact", head: true })
    .eq("season_id", season?.id ?? "")
    .gte("date", today);

  const { count: playerCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, courses(*)")
    .eq("season_id", season?.id ?? "")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-[#9ab8a0] text-sm mt-1">{season?.name}</p>
        </div>
        <Link
          href="/admin/rounds/new"
          className="bg-[#d4af37] text-[#1a3520] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors"
        >
          + New Round
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Upcoming Rounds" value={upcomingCount ?? 0} />
        <StatCard label="Players in League" value={playerCount ?? 0} />
        <StatCard label="Season" value={season?.year ?? "—"} />
      </div>

      {/* Recent Rounds */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Rounds</h2>
          <Link
            href="/admin/rounds/new"
            className="text-sm text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors"
          >
            + Add round
          </Link>
        </div>
        {(rounds?.length ?? 0) === 0 ? (
          <p className="text-[#6a8870] text-sm">No rounds yet. Create your first one!</p>
        ) : (
          <div className="space-y-2">
            {rounds?.map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between py-2.5 border-b border-[#2d5035] last:border-0"
              >
                <div>
                  <p className="font-medium text-white text-sm">
                    {round.courses?.name ?? "Course TBD"}
                  </p>
                  <p className="text-xs text-[#6a8870]">
                    {formatDate(round.date)}
                  </p>
                </div>
                <Link
                  href={`/admin/rounds/${round.id}/edit`}
                  className="text-xs text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors"
                >
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/players"
          className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-5 hover:border-[#d4af37]/40 hover:bg-[#2a4830] transition-all"
        >
          <div className="text-2xl mb-2">👥</div>
          <p className="font-semibold text-white">Manage Players</p>
          <p className="text-sm text-[#9ab8a0] mt-1">
            View the player roster, manage admin access
          </p>
        </Link>
        <Link
          href="/schedule"
          className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-5 hover:border-[#d4af37]/40 hover:bg-[#2a4830] transition-all"
        >
          <div className="text-2xl mb-2">📅</div>
          <p className="font-semibold text-white">View Schedule</p>
          <p className="text-sm text-[#9ab8a0] mt-1">
            See all upcoming rounds and RSVPs
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-5 text-center">
      <div className="text-3xl font-bold text-[#d4af37]">{value}</div>
      <div className="text-xs text-[#9ab8a0] mt-1 font-medium">{label}</div>
    </div>
  );
}
