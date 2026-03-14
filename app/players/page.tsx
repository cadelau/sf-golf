import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RosterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: players } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
        <p className="text-gray-500 text-sm mt-1">
          {players?.length ?? 0} players in the league
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {players?.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {p.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{p.display_name}</p>
                {p.id === user.id && (
                  <span className="text-xs text-green-600 font-medium">You</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="text-sm text-gray-500 hover:text-green-700 transition-colors"
                  >
                    {p.email}
                  </a>
                )}
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    className="text-sm text-gray-500 hover:text-green-700 transition-colors"
                  >
                    {p.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Handicap */}
            <div className="text-right flex-shrink-0">
              {p.handicap !== null ? (
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {p.handicap % 1 === 0
                      ? p.handicap.toFixed(0)
                      : p.handicap.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">HCP</p>
                </div>
              ) : (
                <p className="text-sm text-gray-300">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
