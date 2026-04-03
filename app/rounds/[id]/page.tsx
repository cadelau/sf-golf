import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatTime, scoreToPar } from "@/lib/utils";
import RsvpButton from "@/components/rsvp-button";
import type { HoleScore } from "@/lib/types";

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: round } = await supabase
    .from("rounds")
    .select("*, courses(*), seasons(*)")
    .eq("id", id)
    .single();

  if (!round) notFound();

  // All RSVPs for this round
  const { data: rsvps } = await supabase
    .from("round_players")
    .select("*, profiles(*)")
    .eq("round_id", id)
    .order("rsvp_at", { ascending: true });

  // Current user's RSVP
  const myRsvp = rsvps?.find((r) => r.player_id === user?.id) ?? null;

  const confirmed = rsvps?.filter((r) => r.status === "confirmed") ?? [];
  const tentative = rsvps?.filter((r) => r.status === "tentative") ?? [];
  const waitlist = rsvps?.filter((r) => r.status === "waitlist") ?? [];

  // Group tee times
  const groups = groupByTeeTimes(confirmed);

  // Scorecards
  const { data: rawScorecards } = await supabase
    .from("scorecards")
    .select("*, profiles!scorecards_player_id_fkey(*), hole_scores(*)")
    .eq("round_id", id);

  // Sort by net score if all scorecards have a course_handicap, otherwise by gross
  const allHaveHandicap =
    (rawScorecards?.length ?? 0) > 0 &&
    rawScorecards!.every((sc) => sc.course_handicap !== null);

  const scorecards = [...(rawScorecards ?? [])].sort((a, b) => {
    const aScore = allHaveHandicap
      ? a.total_score - a.course_handicap
      : a.total_score;
    const bScore = allHaveHandicap
      ? b.total_score - b.course_handicap
      : b.total_score;
    return aScore - bScore;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#6a8870] mb-1">
              {round.seasons?.name}
            </p>
            <h1 className="text-2xl font-bold text-white">
              {round.courses?.name ?? "Course TBD"}
            </h1>
            <p className="text-[#9ab8a0] mt-1">{formatDate(round.date)}</p>
            <p className="text-[#9ab8a0] text-sm">
              {round.tee_start_time
                ? `First tee: ${formatTime(round.tee_start_time)} · ${round.tee_interval_minutes} min intervals`
                : "Tee time TBD"}
            </p>
            {round.courses?.city && (
              <p className="text-sm text-[#6a8870] mt-0.5">{round.courses.city}</p>
            )}
            {round.notes && (
              <p className="text-sm text-[#9ab8a0] mt-3 italic border-l-2 border-[#d4af37]/40 pl-3">
                {round.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm bg-green-900/40 text-green-300 border border-green-800/50 rounded-full px-3 py-1 font-medium">
              {confirmed.length}{round.max_players ? ` / ${round.max_players}` : ""} confirmed
            </span>
            {round.is_finalized && (
              <span className="text-xs bg-[#1a3520] text-[#9ab8a0] border border-[#2d5035] rounded-full px-2.5 py-0.5">
                Results finalized
              </span>
            )}
          </div>
        </div>

        {/* RSVP section */}
        {!round.is_finalized && user && (
          <div className="mt-5 pt-5 border-t border-[#2d5035]">
            <p className="text-sm font-medium text-[#9ab8a0] mb-3">
              {myRsvp ? "Update your RSVP:" : "Are you playing?"}
            </p>
            <RsvpButton
              roundId={round.id}
              playerId={user.id}
              currentStatus={myRsvp?.status ?? null}
              maxPlayers={round.max_players}
              confirmedCount={confirmed.length}
            />
          </div>
        )}
      </div>

      {/* Tee Sheet */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <h2 className="font-semibold text-white mb-4">Tee Sheet</h2>
        {confirmed.length === 0 ? (
          <p className="text-[#6a8870] text-sm">No confirmed players yet.</p>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.teeTime ?? "unassigned"}>
                <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
                  {group.teeTime
                    ? `${formatTime(group.teeTime)} — Group ${group.groupNumber}`
                    : "Unassigned"}
                </p>
                <div className="space-y-1">
                  {group.players.map((rsvp) => {
                    const name = rsvp.profiles?.display_name ?? rsvp.guest_name ?? "?";
                    return (
                      <div
                        key={rsvp.id}
                        className="flex items-center gap-3 py-2 px-3 bg-[#1a3520] rounded-lg border border-[#2d5035]"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-sm font-medium text-white">{name}</span>
                        <div className="ml-auto flex items-center gap-2">
                          {rsvp.course_handicap !== null && (
                            <span className="text-xs text-[#9ab8a0]">HCP {rsvp.course_handicap}</span>
                          )}
                          {!rsvp.player_id && (
                            <span className="text-xs text-[#d4af37]/70">Guest</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {confirmed.map((rsvp) => {
              const name = rsvp.profiles?.display_name ?? rsvp.guest_name ?? "?";
              return (
                <div
                  key={rsvp.id}
                  className="flex items-center gap-3 py-2 px-3 bg-[#1a3520] rounded-lg border border-[#2d5035]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-medium text-white">{name}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {rsvp.course_handicap !== null && (
                      <span className="text-xs text-[#9ab8a0]">HCP {rsvp.course_handicap}</span>
                    )}
                    {!rsvp.player_id && (
                      <span className="text-xs text-[#d4af37]/70">Guest</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tentative.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#2d5035]">
            <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
              Tentative
            </p>
            <div className="space-y-1">
              {tentative.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="flex items-center gap-3 py-2 px-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg"
                >
                  <span className="text-xs text-yellow-400 font-bold">~</span>
                  <span className="text-sm text-[#e8f0ea]">
                    {rsvp.profiles?.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {waitlist.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#2d5035]">
            <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
              Waitlist
            </p>
            <div className="space-y-1">
              {waitlist.map((rsvp, i) => (
                <div
                  key={rsvp.id}
                  className="flex items-center gap-3 py-2 px-3 bg-orange-900/20 border border-orange-800/30 rounded-lg"
                >
                  <span className="text-xs text-orange-400 font-bold w-5 text-center">
                    #{i + 1}
                  </span>
                  <span className="text-sm text-[#e8f0ea]">
                    {rsvp.profiles?.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scorecards */}
      {(scorecards?.length ?? 0) > 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <h2 className="font-semibold text-white mb-4">Results</h2>
          <div className="space-y-4">
            {scorecards?.map((sc, i) => (
              <div key={sc.id} className="border border-[#2d5035] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#1a3520]">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"
                          : i === 1
                          ? "bg-[#9ab8a0]/20 text-[#9ab8a0] border border-[#9ab8a0]/40"
                          : i === 2
                          ? "bg-amber-900/40 text-amber-400 border border-amber-700/40"
                          : "bg-[#243d2a] text-[#6a8870] border border-[#2d5035]"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-white">
                      {sc.profiles?.display_name}
                    </span>
                  </div>
                  <div className="text-right">
                    {sc.course_handicap !== null ? (
                      <>
                        <span className="font-bold text-white text-lg">
                          {sc.total_score - sc.course_handicap}
                        </span>
                        <span className="text-xs text-[#9ab8a0] ml-1">net</span>
                        <span className="text-sm text-[#6a8870] ml-2">
                          ({sc.total_score} gross)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-white text-lg">{sc.total_score}</span>
                        {round.courses?.par && (
                          <span className="text-sm text-[#9ab8a0] ml-1">
                            ({scoreToPar(sc.total_score, round.courses.par)})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {sc.hole_scores && sc.hole_scores.length > 0 && (
                  <div className="px-4 py-3 overflow-x-auto">
                    <table className="text-xs w-full min-w-max">
                      <thead>
                        <tr className="text-[#6a8870]">
                          <td className="pr-2 font-medium">Hole</td>
                          {[...sc.hole_scores]
                            .sort((a: HoleScore, b: HoleScore) => a.hole_number - b.hole_number)
                            .map((h: HoleScore) => (
                              <td key={h.hole_number} className="text-center px-1 w-7">
                                {h.hole_number}
                              </td>
                            ))}
                          <td className="text-center px-1 font-medium">Tot</td>
                        </tr>
                        <tr className="text-[#6a8870]">
                          <td className="pr-2">Par</td>
                          {[...sc.hole_scores]
                            .sort((a: HoleScore, b: HoleScore) => a.hole_number - b.hole_number)
                            .map((h: HoleScore) => (
                              <td key={h.hole_number} className="text-center px-1">
                                {h.par}
                              </td>
                            ))}
                          <td className="text-center px-1">
                            {sc.hole_scores.reduce((s: number, h: HoleScore) => s + h.par, 0)}
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="pr-2 font-medium text-[#9ab8a0]">Score</td>
                          {[...sc.hole_scores]
                            .sort((a: HoleScore, b: HoleScore) => a.hole_number - b.hole_number)
                            .map((h: HoleScore) => (
                              <td
                                key={h.hole_number}
                                className={`text-center px-1 font-semibold rounded ${
                                  h.score < h.par
                                    ? "text-red-400"
                                    : h.score === h.par
                                    ? "text-[#9ab8a0]"
                                    : h.score === h.par + 1
                                    ? "text-[#e8f0ea]"
                                    : "text-blue-400"
                                }`}
                              >
                                {h.score}
                              </td>
                            ))}
                          <td className="text-center px-1 font-bold text-white">
                            {sc.total_score}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type RsvpWithProfile = {
  id: string;
  player_id: string | null;
  guest_name: string | null;
  course_handicap: number | null;
  tee_time: string | null;
  group_number: number | null;
  profiles: { display_name: string } | null;
};

function groupByTeeTimes(rsvps: RsvpWithProfile[]) {
  const hasAnyTeeTime = rsvps.some((r) => r.tee_time !== null);
  if (!hasAnyTeeTime) return [];

  const groupMap = new Map<
    string,
    { teeTime: string | null; groupNumber: number | null; players: RsvpWithProfile[] }
  >();

  for (const r of rsvps) {
    const key = r.group_number?.toString() ?? r.tee_time ?? "unassigned";
    const existing = groupMap.get(key);
    if (existing) {
      existing.players.push(r);
    } else {
      groupMap.set(key, {
        teeTime: r.tee_time,
        groupNumber: r.group_number,
        players: [r],
      });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    if (!a.teeTime) return 1;
    if (!b.teeTime) return -1;
    return a.teeTime.localeCompare(b.teeTime);
  });
}
