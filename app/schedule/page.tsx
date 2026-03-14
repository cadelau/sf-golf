import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, courses(*)")
    .eq("season_id", season?.id ?? "")
    .order("date", { ascending: true });

  // Get all RSVPs for this user
  const { data: myRsvps } = await supabase
    .from("round_players")
    .select("round_id, status")
    .eq("player_id", user?.id ?? "");

  const myRsvpMap = new Map(myRsvps?.map((r) => [r.round_id, r.status]) ?? []);

  // Get confirmed counts per round
  const { data: counts } = await supabase
    .from("round_players")
    .select("round_id, status")
    .in("round_id", rounds?.map((r) => r.id) ?? [])
    .eq("status", "confirmed");

  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    countMap.set(c.round_id, (countMap.get(c.round_id) ?? 0) + 1);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = rounds?.filter((r) => r.date >= today) ?? [];
  const past = rounds?.filter((r) => r.date < today) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <span className="text-sm text-[#9ab8a0]">{season?.name}</span>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider mb-3">
          Upcoming Rounds
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-[#6a8870] text-sm">No upcoming rounds scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((round) => {
              const rsvp = myRsvpMap.get(round.id);
              const confirmed = countMap.get(round.id) ?? 0;
              return (
                <RoundCard
                  key={round.id}
                  round={round}
                  rsvpStatus={rsvp ?? null}
                  confirmedCount={confirmed}
                  isPast={false}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="font-semibold text-[#9ab8a0] text-xs uppercase tracking-wider mb-3">
            Past Rounds
          </h2>
          <div className="space-y-3">
            {[...past].reverse().map((round) => {
              const confirmed = countMap.get(round.id) ?? 0;
              return (
                <RoundCard
                  key={round.id}
                  round={round}
                  rsvpStatus={null}
                  confirmedCount={confirmed}
                  isPast={true}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function RoundCard({
  round,
  rsvpStatus,
  confirmedCount,
  isPast,
}: {
  round: {
    id: string;
    date: string;
    tee_start_time: string;
    max_players: number;
    is_finalized: boolean;
    notes: string | null;
    courses: { name: string; city: string; par: number } | null;
  };
  rsvpStatus: string | null;
  confirmedCount: number;
  isPast: boolean;
}) {
  return (
    <Link
      href={`/rounds/${round.id}`}
      className="block bg-[#243d2a] border border-[#2d5035] rounded-xl p-5 hover:border-[#d4af37]/40 hover:bg-[#2a4830] transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white">
            {formatDate(round.date)}
          </p>
          <p className="text-sm font-medium text-[#9ab8a0] mt-0.5">
            {round.courses?.name ?? "Course TBD"}
            {round.courses?.city ? ` · ${round.courses.city}` : ""}
          </p>
          <p className="text-xs text-[#6a8870] mt-0.5">
            {round.tee_start_time ? `First tee ${formatTime(round.tee_start_time)}` : "Tee time TBD"}
          </p>
          {round.notes && (
            <p className="text-xs text-[#9ab8a0] mt-2 italic">{round.notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {isPast ? (
            round.is_finalized ? (
              <span className="text-xs bg-[#1a3520] text-[#9ab8a0] rounded-full px-2.5 py-0.5 font-medium border border-[#2d5035]">
                Results in
              </span>
            ) : (
              <span className="text-xs bg-[#1a3520] text-[#6a8870] rounded-full px-2.5 py-0.5 border border-[#2d5035]">
                Completed
              </span>
            )
          ) : rsvpStatus ? (
            <span
              className={`text-xs rounded-full px-2.5 py-0.5 font-medium border ${
                rsvpStatus === "confirmed"
                  ? "bg-green-900/40 text-green-300 border-green-800/50"
                  : rsvpStatus === "waitlist"
                  ? "bg-orange-900/40 text-orange-300 border-orange-800/50"
                  : rsvpStatus === "tentative"
                  ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50"
                  : "bg-[#1a3520] text-[#6a8870] border-[#2d5035]"
              }`}
            >
              {rsvpStatus === "confirmed"
                ? "✓ In"
                : rsvpStatus === "waitlist"
                ? "Waitlist"
                : rsvpStatus === "tentative"
                ? "~ Tentative"
                : "Declined"}
            </span>
          ) : (
            <span className="text-xs bg-[#d4af37]/10 text-[#d4af37] rounded-full px-2.5 py-0.5 font-medium border border-[#d4af37]/30">
              RSVP →
            </span>
          )}
          <span className="text-xs text-[#6a8870]">
            {confirmedCount}{round.max_players ? `/${round.max_players}` : ""} confirmed
          </span>
        </div>
      </div>
    </Link>
  );
}
