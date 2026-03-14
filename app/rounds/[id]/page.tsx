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
  const waitlist = rsvps?.filter((r) => r.status === "waitlist") ?? [];

  // Group tee times
  const groups = groupByTeeTimes(confirmed);

  // Scorecards
  const { data: scorecards } = await supabase
    .from("scorecards")
    .select("*, profiles(*), hole_scores(*)")
    .eq("round_id", id)
    .order("total_score", { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
              {round.seasons?.name}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              {round.courses?.name}
            </h1>
            <p className="text-gray-500 mt-1">{formatDate(round.date)}</p>
            <p className="text-gray-500 text-sm">
              First tee: {formatTime(round.tee_start_time)} ·{" "}
              {round.tee_interval_minutes} min intervals
            </p>
            {round.courses?.city && (
              <p className="text-sm text-gray-400 mt-0.5">{round.courses.city}</p>
            )}
            {round.notes && (
              <p className="text-sm text-gray-600 mt-3 italic border-l-2 border-green-300 pl-3">
                {round.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm bg-green-100 text-green-800 rounded-full px-3 py-1 font-medium">
              {confirmed.length} / {round.max_players} confirmed
            </span>
            {round.is_finalized && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                Results finalized
              </span>
            )}
          </div>
        </div>

        {/* RSVP section */}
        {!round.is_finalized && user && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Tee Sheet</h2>
        {confirmed.length === 0 ? (
          <p className="text-gray-400 text-sm">No confirmed players yet.</p>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.teeTime ?? "unassigned"}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {group.teeTime
                    ? `${formatTime(group.teeTime)} — Group ${group.groupNumber}`
                    : "Unassigned"}
                </p>
                <div className="space-y-1">
                  {group.players.map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {rsvp.profiles?.display_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {rsvp.profiles?.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {confirmed.map((rsvp) => (
              <div
                key={rsvp.id}
                className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {rsvp.profiles?.display_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {rsvp.profiles?.display_name}
                </span>
              </div>
            ))}
          </div>
        )}

        {waitlist.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Waitlist
            </p>
            <div className="space-y-1">
              {waitlist.map((rsvp, i) => (
                <div
                  key={rsvp.id}
                  className="flex items-center gap-3 py-2 px-3 bg-yellow-50 rounded-lg"
                >
                  <span className="text-xs text-yellow-600 font-bold w-5 text-center">
                    #{i + 1}
                  </span>
                  <span className="text-sm text-gray-700">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Results</h2>
          <div className="space-y-4">
            {scorecards?.map((sc, i) => (
              <div key={sc.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                    <span className="font-semibold text-gray-900">
                      {sc.profiles?.display_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 text-lg">{sc.total_score}</span>
                    {round.courses?.par && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({scoreToPar(sc.total_score, round.courses.par)})
                      </span>
                    )}
                  </div>
                </div>

                {sc.hole_scores && sc.hole_scores.length > 0 && (
                  <div className="px-4 py-3 overflow-x-auto">
                    <table className="text-xs w-full min-w-max">
                      <thead>
                        <tr className="text-gray-400">
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
                        <tr className="text-gray-400">
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
                          <td className="pr-2 font-medium text-gray-600">Score</td>
                          {[...sc.hole_scores]
                            .sort((a: HoleScore, b: HoleScore) => a.hole_number - b.hole_number)
                            .map((h: HoleScore) => (
                              <td
                                key={h.hole_number}
                                className={`text-center px-1 font-semibold rounded ${
                                  h.score < h.par
                                    ? "text-red-600"
                                    : h.score === h.par
                                    ? "text-gray-700"
                                    : h.score === h.par + 1
                                    ? "text-gray-800"
                                    : "text-blue-700"
                                }`}
                              >
                                {h.score}
                              </td>
                            ))}
                          <td className="text-center px-1 font-bold text-gray-900">
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
