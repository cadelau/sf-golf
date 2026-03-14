import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get active season
  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  // Get next upcoming round
  const today = new Date().toISOString().split("T")[0];
  const { data: upcomingRound } = await supabase
    .from("rounds")
    .select("*, courses(*)")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Get current user's RSVP for upcoming round
  let myRsvp = null;
  if (upcomingRound && user) {
    const { data } = await supabase
      .from("round_players")
      .select("*")
      .eq("round_id", upcomingRound.id)
      .eq("player_id", user.id)
      .maybeSingle();
    myRsvp = data;
  }

  // Get confirmed count for upcoming round
  const { count: confirmedCount } = upcomingRound
    ? await supabase
        .from("round_players")
        .select("*", { count: "exact", head: true })
        .eq("round_id", upcomingRound.id)
        .eq("status", "confirmed")
    : { count: 0 };

  // Season standings (top 5)
  const { data: scorecards } = season
    ? await supabase
        .from("scorecards")
        .select("*, profiles(*), rounds!inner(season_id)")
        .eq("rounds.season_id", season.id)
        .not("total_score", "is", null)
    : { data: [] };

  const standings = aggregateStandings(scorecards ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {season?.name ?? "SF Golf League"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Round */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-4">
            Next Round
          </h2>
          {upcomingRound ? (
            <div>
              <p className="text-xl font-bold text-gray-900">
                {upcomingRound.courses?.name}
              </p>
              <p className="text-gray-600 mt-1">{formatDate(upcomingRound.date)}</p>
              <p className="text-gray-500 text-sm">
                First tee: {formatTime(upcomingRound.tee_start_time)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="bg-green-100 text-green-800 rounded-full px-2.5 py-0.5 font-medium">
                  {confirmedCount ?? 0} confirmed
                </span>
                <span className="text-gray-400">of {upcomingRound.max_players} spots</span>
              </div>

              {myRsvp ? (
                <div className="mt-4 text-sm font-medium">
                  {myRsvp.status === "confirmed" && (
                    <span className="text-green-700">✓ You&apos;re in!</span>
                  )}
                  {myRsvp.status === "waitlist" && (
                    <span className="text-yellow-700">⏳ On the waitlist</span>
                  )}
                  {myRsvp.status === "declined" && (
                    <span className="text-gray-500">✗ You&apos;ve declined</span>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <Link
                    href={`/rounds/${upcomingRound.id}`}
                    className="inline-block bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
                  >
                    RSVP Now →
                  </Link>
                </div>
              )}

              <Link
                href={`/rounds/${upcomingRound.id}`}
                className="block mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
              >
                View tee sheet & details →
              </Link>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No upcoming rounds scheduled.</p>
          )}
        </div>

        {/* Season Standings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Season Standings
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs text-green-700 hover:underline font-medium"
            >
              Full standings →
            </Link>
          </div>
          {standings.length === 0 ? (
            <p className="text-gray-400 text-sm">No scores yet this season.</p>
          ) : (
            <ol className="space-y-2">
              {standings.slice(0, 5).map((entry, i) => (
                <li key={entry.player_id} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : i === 1
                        ? "bg-gray-300 text-gray-700"
                        : i === 2
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {entry.display_name}
                  </span>
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    avg {entry.avg_score.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: "/schedule", icon: "📅", label: "Schedule" },
          { href: "/leaderboard", icon: "🏆", label: "Leaderboard" },
          { href: "/schedule", icon: "📊", label: "Past Results" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-green-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-sm font-medium text-gray-700">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  profiles: { display_name: string } | null;
};

function aggregateStandings(scorecards: ScorecardRow[]) {
  const map = new Map<
    string,
    { display_name: string; player_id: string; scores: number[] }
  >();

  for (const sc of scorecards) {
    if (!sc.total_score || !sc.profiles) continue;
    const existing = map.get(sc.player_id);
    if (existing) {
      existing.scores.push(sc.total_score);
    } else {
      map.set(sc.player_id, {
        display_name: sc.profiles.display_name,
        player_id: sc.player_id,
        scores: [sc.total_score],
      });
    }
  }

  return Array.from(map.values())
    .map((p) => ({
      player_id: p.player_id,
      display_name: p.display_name,
      rounds_played: p.scores.length,
      total_score: p.scores.reduce((a, b) => a + b, 0),
      avg_score: p.scores.reduce((a, b) => a + b, 0) / p.scores.length,
    }))
    .sort((a, b) => a.avg_score - b.avg_score);
}
