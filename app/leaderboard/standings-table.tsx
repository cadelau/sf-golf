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
  if (n < 0) return "text-red-400";
  if (n === 0) return "text-[#9ab8a0]";
  return "text-blue-400";
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
          <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
            Player
          </th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
            Rounds
          </th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
            Net to Par
          </th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide hidden sm:table-cell">
            Best Round
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
                <td className="px-4 py-3.5">
                  <span className="font-medium text-white">{entry.display_name}</span>
                  {i === 0 && (
                    <span className="ml-2 text-xs text-[#d4af37] font-medium">Leader</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm">
                  {entry.rounds_counted}
                  {entry.rounds_played > entry.rounds_counted ? ` / ${entry.rounds_played}` : ""}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-white">
                  {formatNetToPar(entry.cumulative_net_to_par)}
                </td>
                <td className="px-4 py-3.5 text-right text-[#9ab8a0] text-sm hidden sm:table-cell">
                  {formatNetToPar(entry.best_round)}
                </td>
                <td className="px-3 py-3.5 text-center text-[#6a8870] text-xs">
                  {isExpanded ? "▲" : "▼"}
                </td>
              </tr>

              {isExpanded && (
                <tr className="border-t border-[#2d5035]">
                  <td colSpan={6} className="bg-[#1a3520] px-4 py-3">
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
