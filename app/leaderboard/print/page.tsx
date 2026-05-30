import { createClient } from "@/lib/supabase/server";
import type { StandingEntry, RoundDetail } from "../standings-table";
import PrintButton from "./print-button";

export default async function PrintStandingsPage() {
  const supabase = await createClient();

  const { data: season } = await supabase.from("seasons").select("*").eq("is_active", true).single();

  const { data: roundRows } = season
    ? await supabase.from("rounds").select("id").eq("season_id", season.id)
    : { data: [] };

  const roundIds = (roundRows ?? []).map((r: { id: string }) => r.id);

  const { data: scorecards } = roundIds.length > 0
    ? await supabase
        .from("scorecards")
        .select("player_id, total_score, course_handicap, profiles!scorecards_player_id_fkey(display_name), rounds(date, courses(name, par))")
        .in("round_id", roundIds)
        .not("total_score", "is", null)
    : { data: [] };

  const standings = aggregateStandings(scorecards ?? []);
  const qualified = standings.filter((s) => s.rounds_counted >= 4);
  const dnq = standings.filter((s) => s.rounds_counted < 4);

  const printDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 0.65in 0.75in; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        @media screen {
          body { background: #f0f0f0 !important; }
        }
      `}</style>

      <div className="no-print flex justify-end p-4">
        <PrintButton />
      </div>

      <div style={{ fontFamily: "Georgia, serif", color: "#111", background: "white", padding: "0 0.75in 0.65in" }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 8, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>Season Standings</div>
            <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{season?.name} · Best 4 net scores to par</div>
          </div>
          <div style={{ fontSize: 11, color: "#777", textAlign: "right" }}>
            Printed {printDate}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #888" }}>
              <th style={{ textAlign: "center", padding: "4px 6px", fontFamily: "Arial, sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#444", width: 30 }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px", fontFamily: "Arial, sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#444" }}>Player</th>
              <th style={{ textAlign: "right", padding: "4px 6px", fontFamily: "Arial, sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#444", width: 80 }}>Net to Par</th>
              <th style={{ textAlign: "center", padding: "4px 6px", fontFamily: "Arial, sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#444" }}>Rounds (counted · dropped)</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, i) => {
              const isQualified = entry.rounds_counted >= 4;
              const isDivider = !isQualified && i > 0 && standings[i - 1].rounds_counted >= 4;
              const score = entry.cumulative_net_to_par;
              const scoreStr = score === 0 ? "E" : score > 0 ? `+${score}` : `${score}`;
              const scoreColor = score < 0 ? "#1a6e30" : "#111";
              const sortedRounds = [...entry.rounds].sort((a, b) => a.netToPar - b.netToPar);

              return (
                <>
                  {isDivider && (
                    <tr key={`div-${i}`}>
                      <td colSpan={4} style={{ borderTop: "1px dashed #ccc", padding: 0, height: 8 }} />
                    </tr>
                  )}
                  <tr key={entry.player_id} style={{ borderBottom: "1px solid #e0e0e0", opacity: isQualified ? 1 : 0.45 }}>
                    <td style={{ textAlign: "center", padding: "6px 6px", fontWeight: "bold", fontSize: 15 }}>{i + 1}</td>
                    <td style={{ padding: "6px 6px", fontSize: 15, fontWeight: "bold" }}>
                      {entry.display_name}
                      {!isQualified && (
                        <span style={{ fontSize: 10, fontWeight: "normal", color: "#aaa", marginLeft: 6, fontFamily: "Arial, sans-serif" }}>did not qualify</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 6px", fontSize: 17, fontWeight: "bold", fontFamily: "Arial, sans-serif", color: scoreColor }}>{scoreStr}</td>
                    <td style={{ textAlign: "center", padding: "6px 6px" }}>
                      {sortedRounds.map((r, j) => {
                        const s = r.netToPar === 0 ? "E" : r.netToPar > 0 ? `+${r.netToPar}` : `${r.netToPar}`;
                        return (
                          <span key={j} style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "50%", width: 26, height: 26, fontSize: 10, fontWeight: "bold",
                            margin: "0 2px", fontFamily: "Arial, sans-serif",
                            border: r.counts ? "2px solid #1a6e30" : "1px solid #ccc",
                            color: r.counts ? "#111" : "#bbb",
                          }}>{s}</span>
                        );
                      })}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 8, borderTop: "1px solid #ddd", fontSize: 10, color: "#888", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
          Circled scores count toward standings · {qualified.length} qualified · {dnq.length} did not qualify
        </div>
      </div>
    </>
  );
}

// ── data helpers ─────────────────────────────────────────────────────────────

type ScorecardRow = {
  player_id: string;
  total_score: number | null;
  course_handicap: number | null;
  profiles: { display_name: string }[] | { display_name: string } | null;
  rounds: { date: string; courses: { name: string; par: number }[] | { name: string; par: number } | null }[] | { date: string; courses: { name: string; par: number }[] | { name: string; par: number } | null } | null;
};

function getProfile(p: ScorecardRow["profiles"]) {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}
function getRound(r: ScorecardRow["rounds"]) {
  if (!r) return null;
  return Array.isArray(r) ? r[0] ?? null : r;
}
function getCourse(c: { name: string; par: number }[] | { name: string; par: number } | null | undefined) {
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function aggregateStandings(scorecards: ScorecardRow[]): StandingEntry[] {
  const map = new Map<string, { display_name: string; player_id: string; rawRounds: { date: string; course: string; gross: number; net: number | null; netToPar: number }[] }>();

  for (const sc of scorecards) {
    if (!sc.total_score) continue;
    const profile = getProfile(sc.profiles);
    if (!profile) continue;
    const roundData = getRound(sc.rounds);
    const courseData = getCourse(roundData?.courses);
    if (!roundData || !courseData) continue;

    const gross = sc.total_score;
    const net = sc.course_handicap != null ? gross - sc.course_handicap : null;
    const netToPar = (net ?? gross) - courseData.par;
    const round = { date: roundData.date, course: courseData.name, gross, net, netToPar };

    const entry = map.get(sc.player_id);
    if (entry) entry.rawRounds.push(round);
    else map.set(sc.player_id, { display_name: profile.display_name, player_id: sc.player_id, rawRounds: [round] });
  }

  return Array.from(map.values())
    .map((p) => {
      const indexed = p.rawRounds.map((r, i) => ({ ...r, idx: i }));
      const sorted = [...indexed].sort((a, b) => a.netToPar - b.netToPar);
      const best4Indices = new Set(sorted.slice(0, 4).map((r) => r.idx));
      const best4 = sorted.slice(0, 4);
      const cumulative_net_to_par = best4.reduce((a, b) => a + b.netToPar, 0);
      const rounds: RoundDetail[] = indexed.slice().sort((a, b) => a.date.localeCompare(b.date)).map(({ idx, ...r }) => ({ ...r, counts: best4Indices.has(idx) }));
      return { player_id: p.player_id, display_name: p.display_name, rounds_played: p.rawRounds.length, rounds_counted: best4.length, cumulative_net_to_par, best_round: sorted[0]?.netToPar ?? 0, rounds } satisfies StandingEntry;
    })
    .sort((a, b) => {
      const aQ = a.rounds_counted >= 4;
      const bQ = b.rounds_counted >= 4;
      if (aQ !== bQ) return aQ ? -1 : 1;
      if (a.cumulative_net_to_par !== b.cumulative_net_to_par) return a.cumulative_net_to_par - b.cumulative_net_to_par;
      if (a.display_name === "Ryan Racer" && b.display_name === "Cade Lau") return -1;
      if (a.display_name === "Cade Lau" && b.display_name === "Ryan Racer") return 1;
      return b.rounds_played - a.rounds_played;
    });
}
