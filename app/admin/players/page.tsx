import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ToggleAdminButton from "./toggle-admin-button";
import ToggleViewerButton from "./toggle-viewer-button";
import HandicapInput from "./handicap-input";
import PhoneInput from "./phone-input";

export default async function PlayersPage() {
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

  const { data: players } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name");

  const members = players?.filter((p) => !p.viewer_only) ?? [];
  const viewers = players?.filter((p) => p.viewer_only) ?? [];

  const playerTable = (list: typeof members, showActions: boolean) => (
    <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#1a3520] border-b border-[#2d5035]">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
              Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
              Email
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden md:table-cell">
              Phone
            </th>
            {showActions && (
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                Handicap
              </th>
            )}
            {showActions && (
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                Admin
              </th>
            )}
            <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
              Access
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2d5035]">
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-[#2a4830] transition-colors">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {p.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{p.display_name}</p>
                    {p.id === user.id && (
                      <p className="text-xs text-[#d4af37]">You</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-sm text-[#9ab8a0] hidden sm:table-cell">
                {p.email}
              </td>
              <td className="px-4 py-3.5 hidden md:table-cell">
                <PhoneInput playerId={p.id} phone={p.phone} />
              </td>
              {showActions && (
                <td className="px-4 py-3.5 text-right">
                  <HandicapInput playerId={p.id} handicap={p.handicap} />
                </td>
              )}
              {showActions && (
                <td className="px-4 py-3.5 text-right">
                  <ToggleAdminButton
                    playerId={p.id}
                    isAdmin={p.is_admin}
                    isSelf={p.id === user.id}
                  />
                </td>
              )}
              <td className="px-4 py-3.5 text-right">
                <ToggleViewerButton
                  playerId={p.id}
                  viewerOnly={p.viewer_only}
                  isSelf={p.id === user.id}
                />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#6a8870]">
                None
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">
          {members.length} full members · {viewers.length} viewer{viewers.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[#9ab8a0] uppercase tracking-wide">
          Full Members
        </h2>
        <p className="text-xs text-[#6a8870]">Can RSVP and appear on the roster.</p>
        {playerTable(members, true)}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[#9ab8a0] uppercase tracking-wide">
          Viewers / Alternates
        </h2>
        <p className="text-xs text-[#6a8870]">
          Read-only access — can see the schedule, tee sheet, and standings but cannot RSVP.
          New sign-ins appear here until promoted.
        </p>
        {playerTable(viewers, false)}
      </div>

      <p className="text-xs text-[#6a8870]">
        Share the app URL to invite someone. They sign in with Google and appear in Viewers until you promote them.
      </p>
    </div>
  );
}
