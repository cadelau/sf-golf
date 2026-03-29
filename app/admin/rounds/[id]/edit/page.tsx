import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import TeeTimeAssigner from "./tee-time-assigner";
import ScoreEntryForm from "./score-entry-form";
import DeleteRoundButton from "./delete-round-button";
import AddPlayerForm from "./add-player-form";

export default async function EditRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  const { data: round } = await supabase
    .from("rounds")
    .select("*, courses(*), seasons(*)")
    .eq("id", id)
    .single();
  if (!round) notFound();

  const { data: rsvps } = await supabase
    .from("round_players")
    .select("*, profiles(*)")
    .eq("round_id", id)
    .order("rsvp_at", { ascending: true });

  const { data: scorecards } = await supabase
    .from("scorecards")
    .select("*, profiles(*), hole_scores(*)")
    .eq("round_id", id);

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  const confirmed = rsvps?.filter((r) => r.status === "confirmed") ?? [];
  const waitlist = rsvps?.filter((r) => r.status === "waitlist") ?? [];

  const alreadyInRound = new Set(rsvps?.map((r) => r.player_id) ?? []);
  const availablePlayers = (allProfiles ?? []).filter(
    (p) => !alreadyInRound.has(p.id)
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#9ab8a0] mb-1">
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin
            </Link>
            <span>›</span>
            <span>Edit Round</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {round.courses?.name ?? "Course TBD"}
          </h1>
          <p className="text-[#9ab8a0] text-sm">
            {formatDate(round.date)}{round.tee_start_time ? ` · ${formatTime(round.tee_start_time)}` : " · Tee time TBD"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/rounds/${round.id}`}
            className="px-4 py-2 border border-[#2d5035] rounded-lg text-sm font-medium text-[#9ab8a0] hover:bg-[#2a4830] hover:text-white transition-colors"
          >
            View Public Page
          </Link>
          <DeleteRoundButton roundId={round.id} />
        </div>
      </div>

      {/* RSVP Summary */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <h2 className="font-semibold text-white mb-4">
          RSVPs — {confirmed.length}{round.max_players ? `/${round.max_players}` : ""} confirmed
        </h2>
        <div className="space-y-1">
          {rsvps?.map((rsvp) => (
            <div
              key={rsvp.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#1a3520]"
            >
              <span
                className={`text-xs rounded-full px-2 py-0.5 font-medium border ${
                  rsvp.status === "confirmed"
                    ? "bg-green-900/40 text-green-300 border-green-800/50"
                    : rsvp.status === "tentative"
                    ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50"
                    : rsvp.status === "waitlist"
                    ? "bg-orange-900/40 text-orange-300 border-orange-800/50"
                    : "bg-[#243d2a] text-[#6a8870] border-[#2d5035]"
                }`}
              >
                {rsvp.status}
              </span>
              <span className="text-sm text-white">
                {rsvp.profiles?.display_name}
              </span>
            </div>
          ))}
          {(rsvps?.length ?? 0) === 0 && (
            <p className="text-[#6a8870] text-sm">No RSVPs yet.</p>
          )}
        </div>

        {waitlist.length > 0 && (
          <p className="text-xs text-yellow-400 mt-3">
            {waitlist.length} on waitlist — they&apos;ll be promoted automatically when
            someone drops
          </p>
        )}

        <AddPlayerForm roundId={round.id} availablePlayers={availablePlayers} />
      </div>

      {/* Tee Time Assignment */}
      {confirmed.length > 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <h2 className="font-semibold text-white mb-4">Tee Time Assignment</h2>
          <TeeTimeAssigner
            roundId={round.id}
            confirmed={confirmed.map((r) => ({
              id: r.id,
              player_id: r.player_id,
              display_name: r.profiles?.display_name ?? "Unknown",
              tee_time: r.tee_time,
              group_number: r.group_number,
            }))}
            teeStartTime={round.tee_start_time}
            teeIntervalMinutes={round.tee_interval_minutes}
            maxPlayers={round.max_players}
          />
        </div>
      )}

      {/* Score Entry */}
      {confirmed.length > 0 && (
        <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
          <h2 className="font-semibold text-white mb-1">Score Entry</h2>
          <p className="text-sm text-[#9ab8a0] mb-4">
            Enter scores after the round is complete.
          </p>
          <ScoreEntryForm
            roundId={round.id}
            coursePar={round.courses?.par ?? 72}
            players={confirmed.map((r) => ({
              player_id: r.player_id,
              display_name: r.profiles?.display_name ?? "Unknown",
            }))}
            existingScorecards={scorecards ?? []}
          />
        </div>
      )}
    </div>
  );
}
