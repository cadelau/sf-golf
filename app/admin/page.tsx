import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  const { data: recentRounds } = await supabase
    .from("rounds")
    .select("*, courses(*)")
    .eq("season_id", season?.id ?? "")
    .order("date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-500 text-sm mt-1">{season?.name}</p>
        </div>
        <Link
          href="/admin/rounds/new"
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Rounds</h2>
          <Link
            href="/admin/rounds/new"
            className="text-sm text-green-700 hover:underline font-medium"
          >
            + Add round
          </Link>
        </div>
        {(recentRounds?.length ?? 0) === 0 ? (
          <p className="text-gray-400 text-sm">No rounds yet. Create your first one!</p>
        ) : (
          <div className="space-y-2">
            {recentRounds?.map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {round.courses?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(round.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/admin/rounds/${round.id}/edit`}
                  className="text-xs text-green-700 hover:text-green-800 font-medium"
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
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-green-300 hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">👥</div>
          <p className="font-semibold text-gray-900">Manage Players</p>
          <p className="text-sm text-gray-500 mt-1">
            View the player roster, manage admin access
          </p>
        </Link>
        <Link
          href="/schedule"
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-green-300 hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📅</div>
          <p className="font-semibold text-gray-900">View Schedule</p>
          <p className="text-sm text-gray-500 mt-1">
            See all upcoming rounds and RSVPs
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
      <div className="text-3xl font-bold text-green-700">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}
