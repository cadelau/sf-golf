import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function PlayerStandingsPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: player } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", playerId)
    .single();

  if (!player) notFound();

  const { data: roundRows } = season
    ? await supabase.from("rounds").select("id").eq("season_id", season.id)
    : { data: [] };

  const roundIds = roundRows?.map((r) => r.id) ?? [];

  const { data: scorecards } =
    roundIds.length > 0
      ? await supabase
          .from("scorecards")
          .select("total_score, course_handicap, rounds(date, courses(name, par))")
          .eq("player_id", playerId)
          .in("round_id", roundIds)
          .not("total_score", "is", null)
      : { data: [] };

  // Build per-round rows and determine which count toward best 5
  type RoundRow = {
    date: string;
    course: string;
    gross: number;
    net: number | null;
    netToPar: number | null;
    counts: boolean;
  };

  const rows: RoundRow[] = (scorecards ?? [])
    .filter((sc) => sc.rounds?.courses?.par != null)
    .map((sc) => {
      const coursePar = sc.rounds!.courses!.par;
      const gross = sc.total_score!;
      const net = sc.course_handicap != null ? gross - sc.course_handicap : null;
      const netToPar = net != null ? net - coursePar : gross - coursePar;
      return {
        date: sc.rounds!.date,
        course: sc.rounds!.courses!.name,
        gross,
        net,
        netToPar,
        counts: false,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Mark best 5
  const indexed = rows.map((r, i) => ({ ...r, i }));
  const sorted = [...indexed].sort((a, b) => a.netToPar! - b.netToPar!);
  const best5Indices = new Set(sorted.slice(0, 5).map((r) => r.i));
  const finalRows = rows.map((r, i) => ({ ...r, counts: best5Indices.has(i) }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-[#9ab8a0] mb-1">
          <Link href="/leaderboard" className="hover:text-white transition-colors">
            Standings
          </Link>
          <span>›</span>
          <span>{player.display_name}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{player.display_name}</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">{season?.name}</p>
      </div>

      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] overflow-hidden">
        {finalRows.length === 0 ? (
          <div className="p-8 text-center text-[#6a8870]">No rounds recorded yet.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1a3520] border-b border-[#2d5035]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
                  Course
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Gross
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Net
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                  Net to Par
                </th>
                <th className="w-6 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5035]">
              {finalRows.map((row, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${row.counts ? "hover:bg-[#2a4830]" : "opacity-50 hover:bg-[#2a4830]"}`}
                >
                  <td className="px-4 py-3.5 text-sm text-white">
                    <span>{formatDate(row.date)}</span>
                    <span className="block text-xs text-[#6a8870] sm:hidden">{row.course}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#9ab8a0] hidden sm:table-cell">
                    {row.course}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#9ab8a0]">
                    {row.gross}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-white font-medium">
                    {row.net ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold">
                    <span className={row.netToPar! < 0 ? "text-red-400" : row.netToPar === 0 ? "text-[#9ab8a0]" : "text-blue-400"}>
                      {row.netToPar === 0 ? "E" : row.netToPar! > 0 ? `+${row.netToPar}` : row.netToPar}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.counts && (
                      <span className="text-[#d4af37] text-xs font-bold" title="Counts toward best 5">★</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[#6a8870] text-center">
        ★ counts toward best 5 · faded rounds are dropped
      </p>
    </div>
  );
}
