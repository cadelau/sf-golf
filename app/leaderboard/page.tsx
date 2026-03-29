import { createClient } from "@/lib/supabase/server";

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
          .select("player_id, total_score, course_handicap, profiles!scorecards_player_id_fkey(display_name)")
          .in("round_id", roundIds)
          .not("total_score", "is", null)
      : { data: [] };

  const standings = aggregateStandings(scorecards ?? []);
  const hasNetScores = standings.some((s) => s.net_avg !== null);

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
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
                  Gross Avg
                </th>
                {hasNetScores && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                    Net Avg
                  </th>
                )}
                {!hasNetScores && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                    Avg
                  </th>
                )}
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
                  Best
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
                    <span className="font-medium text-white">
                      {entry.display_name}
                    </span>
                    {i === 0 && (
                      <span className="ml-2 text-xs text-[#d4af37] font-medium">
                        Leader
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm">
                    {entry.rounds_played}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm hidden sm:table-cell">
                    {entry.gross_avg.toFixed(1)}
                  </td>
                  {hasNetScores && (
                    <td className="px-4 py-3.5 text-right font-semibold text-white">
                      {entry.net_avg !== null ? entry.net_avg.toFixed(1) : "—"}
                    </td>
                  )}
                  {!hasNetScores && (
                    <td className="px-4 py-3.5 text-right font-semibold text-white">
                      {entry.gross_avg.toFixed(1)}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm hidden sm:table-cell">
                    {entry.best_gross}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[#6a8870] text-center">
        {hasNetScores
          ? "Ranked by net average score · Lower is better"
          : "Ranked by average score · Lower is better"}
      </p>
    </div>
  );
}

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  course_handicap: number | null;
  profiles: { display_name: string } | null;
};

function aggregateStandings(scorecards: ScorecardRow[]) {
  const map = new Map<
    string,
    {
      display_name: string;
      player_id: string;
      gross_scores: number[];
      net_scores: number[];
    }
  >();

  for (const sc of scorecards) {
    if (!sc.total_score || !sc.profiles) continue;
    const entry = map.get(sc.player_id);
    const net = sc.course_handicap != null ? sc.total_score - sc.course_handicap : null;
    if (entry) {
      entry.gross_scores.push(sc.total_score);
      if (net !== null) entry.net_scores.push(net);
    } else {
      map.set(sc.player_id, {
        display_name: sc.profiles.display_name,
        player_id: sc.player_id,
        gross_scores: [sc.total_score],
        net_scores: net !== null ? [net] : [],
      });
    }
  }

  return Array.from(map.values())
    .map((p) => {
      const gross_avg = p.gross_scores.reduce((a, b) => a + b, 0) / p.gross_scores.length;
      const net_avg = p.net_scores.length > 0
        ? p.net_scores.reduce((a, b) => a + b, 0) / p.net_scores.length
        : null;
      return {
        player_id: p.player_id,
        display_name: p.display_name,
        rounds_played: p.gross_scores.length,
        gross_avg,
        net_avg,
        best_gross: Math.min(...p.gross_scores),
      };
    })
    .sort((a, b) => {
      const aSort = a.net_avg ?? a.gross_avg;
      const bSort = b.net_avg ?? b.gross_avg;
      return aSort - bSort;
    });
}
