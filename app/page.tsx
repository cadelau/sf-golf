import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import RsvpButton from "@/components/rsvp-button";

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

  // Get ALL rounds for week numbering, then split
  const today = new Date().toISOString().split("T")[0];
  const { data: allRounds } = await supabase
    .from("rounds")
    .select("*, courses(*)")
    .eq("season_id", season?.id ?? "")
    .order("date", { ascending: true });

  const weekNumberMap = new Map((allRounds ?? []).map((r, i) => [r.id, i + 1]));
  const upcomingRounds = allRounds?.filter((r) => r.date >= today) ?? [];
  const upcomingRound = upcomingRounds[0] ?? null;

  // Get user RSVPs for all upcoming rounds
  const { data: myRsvps } = user
    ? await supabase
        .from("round_players")
        .select("round_id, status")
        .eq("player_id", user.id)
        .in("round_id", upcomingRounds.map((r) => r.id))
    : { data: [] };
  const myRsvpMap = new Map(myRsvps?.map((r) => [r.round_id, r.status]) ?? []);

  // Get confirmed counts for all upcoming rounds
  const { data: rsvpCounts } = upcomingRounds.length
    ? await supabase
        .from("round_players")
        .select("round_id, status")
        .in("round_id", upcomingRounds.map((r) => r.id))
        .eq("status", "confirmed")
    : { data: [] };
  const countMap = new Map<string, number>();
  for (const c of rsvpCounts ?? []) {
    countMap.set(c.round_id, (countMap.get(c.round_id) ?? 0) + 1);
  }

  const confirmedCount = upcomingRound ? (countMap.get(upcomingRound.id) ?? 0) : 0;
  const myRsvp = upcomingRound ? (myRsvpMap.get(upcomingRound.id) ?? null) : null;

  // Season standings (top 5)
  const roundIds = allRounds?.map((r) => r.id) ?? [];
  const { data: scorecards } =
    roundIds.length > 0
      ? await supabase
          .from("scorecards")
          .select("*, profiles!scorecards_player_id_fkey(*)")
          .in("round_id", roundIds)
          .not("total_score", "is", null)
      : { data: [] };
  const standings = aggregateStandings(scorecards ?? []);

  // Roster
  const { data: players } = await supabase
    .from("profiles")
    .select("id, display_name, handicap")
    .order("display_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {season?.name ?? "San Francisco Golf"}
        </h1>
        <p className="text-[#9ab8a0] text-sm mt-1">Welcome back!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Next Round */}
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider mb-4">
            Next Round
          </h2>
          {upcomingRound ? (
            <div>
              <p className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-0.5">
                Week {weekNumberMap.get(upcomingRound.id)}
              </p>
              <p className="text-xl font-bold text-white">
                {formatDate(upcomingRound.date)}
              </p>
              <p className="text-[#e8f0ea] font-medium mt-0.5">
                {upcomingRound.courses?.name ?? "Course TBD"}
              </p>
              {upcomingRound.tee_start_time && (
                <p className="text-[#6a8870] text-sm">
                  First tee {formatTime(upcomingRound.tee_start_time)}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="bg-green-900/40 text-green-300 rounded-full px-2.5 py-0.5 font-medium border border-green-800/50">
                  {confirmedCount} confirmed
                </span>
                {upcomingRound.max_players && (
                  <span className="text-[#6a8870]">of {upcomingRound.max_players} spots</span>
                )}
              </div>

              {user && (
                <div className="mt-4">
                  <RsvpButton
                    roundId={upcomingRound.id}
                    playerId={user.id}
                    currentStatus={myRsvp as "confirmed" | "waitlist" | "declined" | "tentative" | null}
                    maxPlayers={upcomingRound.max_players}
                    confirmedCount={confirmedCount}
                  />
                </div>
              )}

              <Link
                href={`/rounds/${upcomingRound.id}`}
                className="block mt-4 text-sm text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors"
              >
                View tee sheet & details →
              </Link>
            </div>
          ) : (
            <p className="text-[#6a8870] text-sm">No upcoming rounds scheduled.</p>
          )}
        </div>

        {/* Season Standings */}
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider">
              Season Standings
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors"
            >
              Full standings →
            </Link>
          </div>
          {standings.length === 0 ? (
            <p className="text-[#6a8870] text-sm">No scores yet this season.</p>
          ) : (
            <ol className="space-y-2">
              {standings.slice(0, 5).map((entry, i) => (
                <li key={entry.player_id} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0
                        ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"
                        : i === 1
                        ? "bg-[#9ab8a0]/20 text-[#9ab8a0] border border-[#9ab8a0]/40"
                        : i === 2
                        ? "bg-amber-900/40 text-amber-400 border border-amber-700/40"
                        : "bg-[#1a3520] text-[#6a8870] border border-[#2d5035]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-white truncate">
                    {entry.display_name}
                  </span>
                  <span className="text-sm text-[#9ab8a0] flex-shrink-0">
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
            className="bg-[#243d2a] border border-[#2d5035] rounded-xl p-4 text-center hover:border-[#d4af37]/50 hover:bg-[#2a4830] transition-all"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-sm font-medium text-[#9ab8a0]">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming Rounds */}
      {upcomingRounds.length > 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider">
              Upcoming Rounds
            </h2>
            <Link href="/schedule" className="text-xs text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors">
              Full schedule →
            </Link>
          </div>
          <div className="space-y-1">
            {upcomingRounds.map((round) => {
              const rsvp = myRsvpMap.get(round.id);
              const confirmed = countMap.get(round.id) ?? 0;
              const spotsLeft = round.max_players ? round.max_players - confirmed : null;
              return (
                <Link
                  key={round.id}
                  href={`/rounds/${round.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#2a4830] transition-colors group"
                >
                  <span className="text-xs font-bold text-[#d4af37] w-8 flex-shrink-0">
                    W{weekNumberMap.get(round.id)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white group-hover:text-[#e8f0ea] transition-colors">
                      {formatDate(round.date)}
                    </span>
                    <span className="text-[#6a8870] text-sm ml-2">
                      {round.courses?.name ?? "Course TBD"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {spotsLeft !== null && spotsLeft <= 3 && spotsLeft > 0 && (
                      <span className="text-xs text-yellow-400 font-medium">{spotsLeft} left</span>
                    )}
                    {spotsLeft === 0 && (
                      <span className="text-xs text-red-400 font-medium">Full</span>
                    )}
                    {rsvp && (
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium border ${
                        rsvp === "confirmed" ? "bg-green-900/40 text-green-300 border-green-800/50"
                        : rsvp === "waitlist" ? "bg-orange-900/40 text-orange-300 border-orange-800/50"
                        : rsvp === "tentative" ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50"
                        : "bg-[#1a3520] text-[#6a8870] border-[#2d5035]"
                      }`}>
                        {rsvp === "confirmed" ? "✓ In" : rsvp === "waitlist" ? "Waitlist" : rsvp === "tentative" ? "Maybe" : "Out"}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Roster */}
      {(players?.length ?? 0) > 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider">
              Roster
            </h2>
            <Link href="/players" className="text-xs text-[#d4af37] hover:text-[#e8c84a] font-medium transition-colors">
              Full roster →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players?.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {p.display_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.display_name}</p>
                  {p.handicap != null && (
                    <p className="text-xs text-[#6a8870]">HCP {p.handicap % 1 === 0 ? p.handicap.toFixed(0) : p.handicap.toFixed(1)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
