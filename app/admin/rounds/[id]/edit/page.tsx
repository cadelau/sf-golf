import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import TeeTimeAssigner from "./tee-time-assigner";
import ScoreEntryForm from "./score-entry-form";
import DeleteRoundButton from "./delete-round-button";
import RsvpManager from "./rsvp-manager";
import AddPlayerForm from "./add-player-form";
import EditRoundDetailsForm from "./edit-round-details-form";

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
    .select("*, profiles!scorecards_player_id_fkey(*), hole_scores(*)")
    .eq("round_id", id);

  const { data: courseHoles } = round.course_id
    ? await supabase
        .from("course_holes")
        .select("hole_number, par")
        .eq("course_id", round.course_id)
        .order("hole_number", { ascending: true })
    : { data: [] };

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, name, city, par")
    .order("name", { ascending: true });

  const confirmed = rsvps?.filter((r) => r.status === "confirmed") ?? [];
  const waitlist = rsvps?.filter((r) => r.status === "waitlist") ?? [];

  const alreadyInRound = new Set(
    rsvps?.map((r) => r.player_id).filter(Boolean) ?? []
  );
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

      {/* Round Details */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <h2 className="font-semibold text-white mb-4">Round Details</h2>
        <EditRoundDetailsForm
          round={{
            id: round.id,
            course_id: round.course_id,
            date: round.date,
            tee_start_time: round.tee_start_time,
            tee_interval_minutes: round.tee_interval_minutes,
            max_players: round.max_players,
            notes: round.notes,
          }}
          courses={allCourses ?? []}
        />
      </div>

      {/* RSVP Management */}
      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] p-6">
        <h2 className="font-semibold text-white mb-4">
          RSVPs — {confirmed.length}{round.max_players ? `/${round.max_players}` : ""} confirmed
        </h2>
        <RsvpManager
          initialRsvps={
            rsvps?.map((r) => ({
              id: r.id,
              player_id: r.player_id ?? null,
              status: r.status,
              display_name: r.profiles?.display_name ?? r.guest_name ?? "Unknown",
              is_guest: !r.player_id,
            })) ?? []
          }
        />
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
              player_id: r.player_id ?? r.id,
              display_name: r.profiles?.display_name ?? r.guest_name ?? "Unknown",
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
            courseHoles={courseHoles ?? []}
            players={confirmed
              .filter((r) => r.player_id !== null)
              .map((r) => ({
                player_id: r.player_id!,
                display_name: r.profiles?.display_name ?? "Unknown",
              }))}
            existingScorecards={scorecards ?? []}
          />
        </div>
      )}
    </div>
  );
}
