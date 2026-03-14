import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ToggleAdminButton from "./toggle-admin-button";
import HandicapInput from "./handicap-input";

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
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <p className="text-gray-500 text-sm mt-1">
          {players?.length ?? 0} members in the league
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                Email
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Handicap
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Admin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {players?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {p.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {p.display_name}
                      </p>
                      {p.id === user.id && (
                        <p className="text-xs text-green-600">You</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-500 hidden sm:table-cell">
                  {p.email}
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

      <p className="text-xs text-gray-400">
        Players join automatically when they first sign in. Admins can manage rounds and enter scores.
      </p>
    </div>
  );
}
