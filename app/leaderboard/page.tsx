import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: roundRows } = season
    ? await supabase
        .from("rounds")
        .select("id")
        .eq("season_id", season.id)
    : { data: [] };

  const roundIds = roundRows?.map((r) => r.id) ?? [];

  const { data: scorecards } =
    roundIds.length > 0
      ? await supabase
          .from("scorecards")
          .select(
            "player_id, total_score, course_handicap, profiles!scorecards_player_id_fkey(display_name), rounds(courses(par))"
          )
          .in("round_id", roundIds)
          .not("total_score", "is", null)
      : { data: [] };

  const standings = aggregateStandings(scorecards ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Season Standings</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">{season?.name}</p>
      </div>

      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] overflow-hidden">
        {standings.length === 0 ? (
          <div className="p-8 text-center text-[#6a8870]">
            No scores recorded yet this season.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1a3520] border-b border-[#2d5035]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-10">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Player
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Rounds
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Net to Par
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
                  Best Round
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5035]">
              {standings.map((entry, i) => (
                <tr key={entry.player_id} className="hover:bg-[#2a4830] transition-colors">
                  <td className="px-4 py-3.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"
                          : i === 1
                          ? "bg-[#9ab8a0]/20 text-[#9ab8a0] border border-[#9ab8a0]/40"
                          : i === 2
                          ? "bg-amber-900/40 text-amber-400 border border-amber-700/40"
                          : "text-[#6a8870]"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/leaderboard/${entry.player_id}`}
                      className="font-medium text-white hover:text-[#d4af37] transition-colors"
                    >
                      {entry.display_name}
                    </Link>
                    {i === 0 && (
                      <span className="ml-2 text-xs text-[#d4af37] font-medium">
                        Leader
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm">
                    {entry.rounds_counted}{entry.rounds_played > entry.rounds_counted ? ` / ${entry.rounds_played}` : ""}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white">
                    {formatNetToPar(entry.cumulative_net_to_par)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm hidden sm:table-cell">
                    {formatNetToPar(entry.best_round)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[#6a8870] text-center">
        Best 5 net scores to par · More rounds played ranks higher · Lower is better
      </p>
    </div>
  );
}

function formatNetToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  course_handicap: number | null;
  profiles: { display_name: string } | null;
  rounds: { courses: { par: number } | null } | null;
};

function aggregateStandings(scorecards: ScorecardRow[]) {
  const map = new Map<
    string,
    { display_name: string; player_id: string; net_to_pars: number[] }
  >();

  for (const sc of scorecards) {
    if (!sc.total_score || !sc.profiles) continue;
    const coursePar = sc.rounds?.courses?.par;
    if (coursePar == null) continue;

    const net = sc.course_handicap != null
      ? sc.total_score - sc.course_handicap
      : sc.total_score;
    const netToPar = net - coursePar;

    const entry = map.get(sc.player_id);
    if (entry) {
      entry.net_to_pars.push(netToPar);
    } else {
      map.set(sc.player_id, {
        display_name: sc.profiles.display_name,
        player_id: sc.player_id,
        net_to_pars: [netToPar],
      });
    }
  }

  return Array.from(map.values())
    .map((p) => {
      const sorted = [...p.net_to_pars].sort((a, b) => a - b);
      const best5 = sorted.slice(0, 5);
      const cumulative_net_to_par = best5.reduce((a, b) => a + b, 0);
      return {
        player_id: p.player_id,
        display_name: p.display_name,
        rounds_played: p.net_to_pars.length,
        rounds_counted: best5.length,
        cumulative_net_to_par,
        best_round: sorted[0] ?? 0,
      };
    })
    .sort((a, b) => {
      // More rounds counted ranks higher; ties broken by cumulative net to par
      if (b.rounds_counted !== a.rounds_counted) return b.rounds_counted - a.rounds_counted;
      return a.cumulative_net_to_par - b.cumulative_net_to_par;
    });
}
