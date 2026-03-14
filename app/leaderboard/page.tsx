import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: scorecards } = season
    ? await supabase
        .from("scorecards")
        .select("*, profiles(*), rounds!inner(season_id)")
        .eq("rounds.season_id", season.id)
        .not("total_score", "is", null)
    : { data: [] };

  const standings = aggregateStandings(scorecards ?? []);
  const hasHandicaps = standings.some((s) => s.handicap !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Season Standings</h1>
        <p className="text-gray-500 text-sm mt-1">{season?.name}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {standings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No scores recorded yet this season.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Player
                </th>
                {hasHandicaps && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    HCP
                  </th>
                )}
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rounds
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Gross Avg
                </th>
                {hasHandicaps && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Net Avg
                  </th>
                )}
                {!hasHandicaps && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Avg
                  </th>
                )}
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Best
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {standings.map((entry, i) => (
                <tr key={entry.player_id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-yellow-400 text-yellow-900"
                          : i === 1
                          ? "bg-gray-300 text-gray-700"
                          : i === 2
                          ? "bg-amber-600 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-gray-900">
                      {entry.display_name}
                    </span>
                    {i === 0 && (
                      <span className="ml-2 text-xs text-yellow-600 font-medium">
                        Leader
                      </span>
                    )}
                  </td>
                  {hasHandicaps && (
                    <td className="px-4 py-3.5 text-right text-gray-500 text-sm hidden sm:table-cell">
                      {entry.handicap !== null ? entry.handicap.toFixed(1) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right text-gray-600 text-sm">
                    {entry.rounds_played}
                  </td>
                  {hasHandicaps && (
                    <td className="px-4 py-3.5 text-right text-gray-500 text-sm hidden sm:table-cell">
                      {entry.gross_avg.toFixed(1)}
                    </td>
                  )}
                  {!hasHandicaps && (
                    <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                      {entry.gross_avg.toFixed(1)}
                    </td>
                  )}
                  {hasHandicaps && (
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                      {entry.net_avg !== null ? entry.net_avg.toFixed(1) : entry.gross_avg.toFixed(1)}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right text-gray-600 text-sm hidden sm:table-cell">
                    {entry.best_gross}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {hasHandicaps
          ? "Ranked by net average score (gross avg − handicap) · Lower is better"
          : "Ranked by average score · Lower is better"}
      </p>
    </div>
  );
}

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  profiles: { display_name: string; handicap: number | null } | null;
};

function aggregateStandings(scorecards: ScorecardRow[]) {
  const map = new Map<
    string,
    {
      display_name: string;
      player_id: string;
      handicap: number | null;
      scores: number[];
    }
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
        handicap: sc.profiles.handicap,
        scores: [sc.total_score],
      });
    }
  }

  return Array.from(map.values())
    .map((p) => {
      const gross_avg = p.scores.reduce((a, b) => a + b, 0) / p.scores.length;
      const net_avg =
        p.handicap !== null ? gross_avg - p.handicap : null;
      return {
        player_id: p.player_id,
        display_name: p.display_name,
        handicap: p.handicap,
        rounds_played: p.scores.length,
        gross_avg,
        net_avg,
        best_gross: Math.min(...p.scores),
      };
    })
    .sort((a, b) => {
      const aSort = a.net_avg ?? a.gross_avg;
      const bSort = b.net_avg ?? b.gross_avg;
      return aSort - bSort;
    });
}
