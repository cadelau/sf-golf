import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import TeeTimeAssigner from "./tee-time-assigner";
import ScoreEntryForm from "./score-entry-form";

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

  const confirmed = rsvps?.filter((r) => r.status === "confirmed") ?? [];
  const waitlist = rsvps?.filter((r) => r.status === "waitlist") ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-gray-700">
              Admin
            </Link>
            <span>›</span>
            <span>Edit Round</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {round.courses?.name}
          </h1>
          <p className="text-gray-500 text-sm">
            {formatDate(round.date)} · {formatTime(round.tee_start_time)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/rounds/${round.id}`}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Public Page
          </Link>
        </div>
      </div>

      {/* RSVP Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          RSVPs — {confirmed.length}/{round.max_players} confirmed
        </h2>
        <div className="space-y-1">
          {rsvps?.map((rsvp) => (
            <div
              key={rsvp.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50"
            >
              <span
                className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  rsvp.status === "confirmed"
                    ? "bg-green-100 text-green-800"
                    : rsvp.status === "waitlist"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {rsvp.status}
              </span>
              <span className="text-sm text-gray-800">
                {rsvp.profiles?.display_name}
              </span>
            </div>
          ))}
          {(rsvps?.length ?? 0) === 0 && (
            <p className="text-gray-400 text-sm">No RSVPs yet.</p>
          )}
        </div>

        {waitlist.length > 0 && (
          <p className="text-xs text-yellow-700 mt-3">
            {waitlist.length} on waitlist — they&apos;ll be promoted automatically when
            someone drops
          </p>
        )}
      </div>

      {/* Tee Time Assignment */}
      {confirmed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Tee Time Assignment</h2>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Score Entry</h2>
          <p className="text-sm text-gray-500 mb-4">
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
