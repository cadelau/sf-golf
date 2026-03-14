import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ToggleAdminButton from "./toggle-admin-button";
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <p className="text-[#9ab8a0] text-sm mt-1">
          {players?.length ?? 0} members in the league
        </p>
      </div>

      <div className="bg-[#243d2a] rounded-xl border border-[#2d5035] overflow-hidden">
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
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                Handicap
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
                Admin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d5035]">
            {players?.map((p) => (
              <tr key={p.id} className="hover:bg-[#2a4830] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {p.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">
                        {p.display_name}
                      </p>
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
                <td className="px-4 py-3.5 text-right">
                  <HandicapInput playerId={p.id} handicap={p.handicap} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <ToggleAdminButton
                    playerId={p.id}
                    isAdmin={p.is_admin}
                    isSelf={p.id === user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#6a8870]">
        Players join automatically when they first sign in. Admins can manage rounds and enter scores.
      </p>
    </div>
  );
}
