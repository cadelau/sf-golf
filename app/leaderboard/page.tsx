import { createClient } from "@/lib/supabase/server";
import StandingsTable, { type StandingEntry, type RoundDetail } from "./standings-table";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: roundRows } = season
    ? await supabase.from("rounds").select("id").eq("season_id", season.id)
    : { data: [] };

  const roundIds = roundRows?.map((r) => r.id) ?? [];

  const { data: scorecards } =
    roundIds.length > 0
      ? await supabase
          .from("scorecards")
          .select(
            "player_id, total_score, course_handicap, profiles!scorecards_player_id_fkey(display_name), rounds(date, courses(name, par))"
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
        <StandingsTable standings={standings} />
      </div>

      <p className="text-xs text-[#6a8870] text-center">
        Best 5 net scores to par · More rounds played ranks higher · Lower is better · Click a player to expand
      </p>
    </div>
  );
}

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  course_handicap: number | null;
  profiles: { display_name: string } | null;
  rounds: { date: string; courses: { name: string; par: number } | null } | null;
};

function aggregateStandings(scorecards: ScorecardRow[]): StandingEntry[] {
  const map = new Map<
    string,
    {
      display_name: string;
      player_id: string;
      rawRounds: { date: string; course: string; gross: number; net: number | null; netToPar: number }[];
    }
  >();

  for (const sc of scorecards) {
    if (!sc.total_score || !sc.profiles) continue;
    const coursePar = sc.rounds?.courses?.par;
    if (coursePar == null) continue;

    const gross = sc.total_score;
    const net = sc.course_handicap != null ? gross - sc.course_handicap : null;
    const netToPar = (net ?? gross) - coursePar;

    const round = { date: sc.rounds!.date, course: sc.rounds!.courses!.name, gross, net, netToPar };
    const entry = map.get(sc.player_id);
    if (entry) {
      entry.rawRounds.push(round);
    } else {
      map.set(sc.player_id, {
        display_name: sc.profiles.display_name,
        player_id: sc.player_id,
        rawRounds: [round],
      });
    }
  }

  return Array.from(map.values())
    .map((p) => {
      // Tag each round with its original index, sort by netToPar, mark best 5
      const indexed = p.rawRounds.map((r, i) => ({ ...r, idx: i }));
      const sorted = [...indexed].sort((a, b) => a.netToPar - b.netToPar);
      const best5Indices = new Set(sorted.slice(0, 5).map((r) => r.idx));
      const best5 = sorted.slice(0, 5);
      const cumulative_net_to_par = best5.reduce((a, b) => a + b.netToPar, 0);

      const rounds: RoundDetail[] = indexed
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(({ idx, ...r }) => ({ ...r, counts: best5Indices.has(idx) }));

      return {
        player_id: p.player_id,
        display_name: p.display_name,
        rounds_played: p.rawRounds.length,
        rounds_counted: best5.length,
        cumulative_net_to_par,
        best_round: sorted[0]?.netToPar ?? 0,
        rounds,
      } satisfies StandingEntry;
    })
    .sort((a, b) => {
      if (b.rounds_counted !== a.rounds_counted) return b.rounds_counted - a.rounds_counted;
      return a.cumulative_net_to_par - b.cumulative_net_to_par;
    });
}
