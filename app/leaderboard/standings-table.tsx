"use client";

import { useState, Fragment } from "react";
import { formatDate } from "@/lib/utils";

export type RoundDetail = {
  date: string;
  course: string;
  gross: number;
  net: number | null;
  netToPar: number;
  counts: boolean;
};

export type StandingEntry = {
  player_id: string;
  display_name: string;
  rounds_played: number;
  rounds_counted: number;
  cumulative_net_to_par: number;
  best_round: number;
  rounds: RoundDetail[];
};

function formatNetToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function netToParColor(n: number): string {
  if (n < 0) return "text-green-400";
  if (n === 0) return "text-[#9ab8a0]";
  return "text-white";
}

function ScorePips({ rounds, small = false }: { rounds: RoundDetail[]; small?: boolean }) {
  const counting = [...rounds.filter((r) => r.counts)].sort((a, b) => a.netToPar - b.netToPar);
  const qualified = counting.length === 5;
  const slots = Array.from({ length: 5 }, (_, i) => counting[i] ?? null);
  const size = small ? "w-7 h-7" : "w-8 h-8";
  const filledBorder = qualified ? "border-green-500" : "border-[#4a6a50]";
  const emptyBorder = qualified ? "border-green-500/40" : "border-[#3d5c42]";
  return (
    <div className="flex gap-1.5">
      {slots.map((r, i) =>
        r ? (
          <span
            key={i}
            className={`inline-flex items-center justify-center text-xs font-semibold rounded-full border-2 bg-[#1e3824] text-white ${size} ${filledBorder}`}
          >
            {formatNetToPar(r.netToPar)}
          </span>
        ) : (
          <span key={i} className={`inline-flex rounded-full border-2 border-dashed ${size} ${emptyBorder}`} />
        )
      )}
    </div>
  );
}

export default function StandingsTable({ standings }: { standings: StandingEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (standings.length === 0) {
    return (
      <div className="p-8 text-center text-[#6a8870]">
        No scores recorded yet this season.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-[#1a3520] border-b border-[#2d5035]">
        <tr>
          <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-10">
            #
          </th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide whitespace-nowrap">
            Player
          </th>
          <th className="text-right px-3 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-20 whitespace-nowrap">
            Net to Par
          </th>
          <th className="text-center px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
            Rounds
          </th>
          <th className="w-8" />
        </tr>
      </thead>
      <tbody>
        {standings.map((entry, i) => {
          const isExpanded = expandedId === entry.player_id;
          return (
            <Fragment key={entry.player_id}>
              <tr
                onClick={() => setExpandedId(isExpanded ? null : entry.player_id)}
                className="border-t border-[#2d5035] hover:bg-[#2a4830] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3.5">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"
                        : i === 1
                        ? "bg-[#9ab8a0]/20 text-[#9ab8a0] border border-[#9ab8a0]/40"
                        : i === 2
                        ? "bg-amber-900/40 text-amber-400 border border-amber-700/40"
                        : "text-[#6a8870]"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-medium text-white">{entry.display_name}</span>
                  {i === 0 && (
                    <span className="ml-2 text-xs text-[#d4af37] font-medium">Leader</span>
                  )}
                  <div className="mt-1.5 sm:hidden">
                    <ScorePips rounds={entry.rounds} small />
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap">
                  <span className={`text-lg font-bold tabular-nums ${netToParColor(entry.cumulative_net_to_par)}`}>
                    {formatNetToPar(entry.cumulative_net_to_par)}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <div className="flex justify-center">
                    <ScorePips rounds={entry.rounds} />
                  </div>
                </td>
                <td className="px-3 py-3.5 text-center text-[#6a8870] text-xs">
                  {isExpanded ? "▲" : "▼"}
                </td>
              </tr>

              {isExpanded && (
                <tr className="border-t border-[#2d5035]">
                  <td colSpan={5} className="bg-[#1a3520] px-4 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#6a8870] text-xs uppercase tracking-wide">
                          <th className="text-left pb-2 font-medium">Date</th>
                          <th className="text-left pb-2 font-medium hidden sm:table-cell">Course</th>
                          <th className="text-right pb-2 font-medium">Gross</th>
                          <th className="text-right pb-2 font-medium">Net</th>
                          <th className="text-right pb-2 font-medium">Net to Par</th>
                          <th className="w-5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2d5035]/50">
                        {entry.rounds.map((r, j) => (
                          <tr key={j} className={r.counts ? "" : "opacity-40"}>
                            <td className="py-2 text-[#9ab8a0]">
                              {formatDate(r.date)}
                              <span className="block text-xs text-[#6a8870] sm:hidden">{r.course}</span>
                            </td>
                            <td className="py-2 text-[#9ab8a0] hidden sm:table-cell">{r.course}</td>
                            <td className="py-2 text-right text-[#9ab8a0]">{r.gross}</td>
                            <td className="py-2 text-right text-white font-medium">{r.net ?? "—"}</td>
                            <td className={`py-2 text-right font-semibold ${netToParColor(r.netToPar)}`}>
                              {formatNetToPar(r.netToPar)}
                            </td>
                            <td className="py-2 text-center text-[#d4af37] text-xs">
                              {r.counts ? "★" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
