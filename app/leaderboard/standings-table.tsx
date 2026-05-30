"use client";

import { useState, Fragment } from "react";
import { formatDate } from "@/lib/utils";
import PayToggle from "./pay-toggle";

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

type Mode = "top4" | "drop1" | "drop2";
const COUNT: Record<Mode, number> = { top4: 4, drop1: 3, drop2: 2 };

function formatNetToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function netToParColor(n: number): string {
  if (n < 0) return "text-green-400";
  if (n === 0) return "text-[#9ab8a0]";
  return "text-white";
}

function recomputeStandings(standings: StandingEntry[], mode: Mode): StandingEntry[] {
  const n = COUNT[mode];
  return standings
    .map((entry) => {
      const sorted = [...entry.rounds].sort((a, b) => a.netToPar - b.netToPar);
      const best = sorted.slice(0, n);
      const cumulative_net_to_par = best.reduce((sum, r) => sum + r.netToPar, 0);
      return { ...entry, cumulative_net_to_par };
    })
    .sort((a, b) => {
      const aQ = a.rounds.length >= n;
      const bQ = b.rounds.length >= n;
      if (aQ !== bQ) return aQ ? -1 : 1;
      if (a.cumulative_net_to_par !== b.cumulative_net_to_par)
        return a.cumulative_net_to_par - b.cumulative_net_to_par;
      if (a.display_name === "Ryan Racer" && b.display_name === "Cade Lau") return -1;
      if (a.display_name === "Cade Lau" && b.display_name === "Ryan Racer") return 1;
      return b.rounds_played - a.rounds_played;
    });
}

function ScorePips({ rounds, countedN, small = false }: {
  rounds: RoundDetail[];
  countedN: number;
  small?: boolean;
}) {
  const sorted = [...rounds].sort((a, b) => a.netToPar - b.netToPar);
  const qualified = sorted.length >= countedN;
  const size = small ? "w-8 h-8" : "w-7 h-7";

  const slots = Array.from({ length: small ? 5 : 10 }, (_, i) => {
    const r = sorted[i];
    if (!r) return null;
    return { ...r, counts: i < countedN };
  });

  return (
    <div className="flex gap-1">
      {slots.map((r, i) => {
        if (!r) {
          return (
            <span key={i} className={`inline-flex rounded-full border-2 border-dashed border-[#2d3d2f] ${size}`} />
          );
        }
        if (r.counts) {
          return (
            <span
              key={i}
              className={`inline-flex items-center justify-center text-xs font-semibold rounded-full border-2 bg-[#1e3824] text-white ${size} ${qualified ? "border-green-500" : "border-[#4a6a50]"}`}
            >
              {formatNetToPar(r.netToPar)}
            </span>
          );
        }
        return (
          <span
            key={i}
            className={`inline-flex items-center justify-center text-xs font-semibold rounded-full border-2 bg-[#151f16] text-[#4a6a50] border-[#2a3a2c] ${size}`}
          >
            {formatNetToPar(r.netToPar)}
          </span>
        );
      })}
    </div>
  );
}

export default function StandingsTable({
  standings,
  isAdmin = false,
  seasonId = "",
  payments = {},
}: {
  standings: StandingEntry[];
  isAdmin?: boolean;
  seasonId?: string;
  payments?: Record<string, boolean>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("top4");

  const displayed = recomputeStandings(standings, mode);
  const countedN = COUNT[mode];

  if (standings.length === 0) {
    return (
      <div className="p-8 text-center text-[#6a8870]">
        No scores recorded yet this season.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d5035]">
        <span className="text-xs text-[#9ab8a0] uppercase tracking-wide font-semibold">Scenario</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="bg-[#1a3520] text-white text-sm border border-[#2d5035] rounded px-2 py-1.5 focus:outline-none focus:border-[#4a7a50] cursor-pointer"
        >
          <option value="top4">Top 4 scores</option>
          <option value="drop1">Drop 1 score</option>
          <option value="drop2">Drop 2 scores</option>
        </select>
      </div>

      <table className="w-full">
        <thead className="bg-[#1a3520] border-b border-[#2d5035]">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-10">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide">
              Player
            </th>
            <th className="text-right pr-4 pl-2 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-24">
              Net to Par
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-64 hidden sm:table-cell">
              Rounds
            </th>
            {isAdmin && (
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide w-16 hidden sm:table-cell">
                Buy-In
              </th>
            )}
            <th className="w-10 hidden sm:table-cell" />
          </tr>
        </thead>
        <tbody>
          {displayed.map((entry, i) => {
            const isExpanded = expandedId === entry.player_id;
            const qualified = entry.rounds.length >= countedN;
            return (
              <Fragment key={entry.player_id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : entry.player_id)}
                  className={`border-t border-[#2d5035] hover:bg-[#2a4830] cursor-pointer transition-colors ${!qualified ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        !qualified
                          ? "text-[#4a5a4c]"
                          : i === 0
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
                  <td className="px-4 py-3.5 overflow-hidden">
                    <span className="text-base font-semibold text-white whitespace-nowrap">{entry.display_name}</span>
                    {i === 0 && qualified && (
                      <span className="ml-2 text-xs text-[#d4af37] font-medium">Leader</span>
                    )}
                    <div className="mt-1.5 sm:hidden">
                      <ScorePips rounds={entry.rounds} countedN={countedN} small />
                    </div>
                  </td>
                  <td className="pl-2 pr-4 py-3.5 text-right">
                    <span className={`text-lg font-bold tabular-nums ${netToParColor(entry.cumulative_net_to_par)}`}>
                      {formatNetToPar(entry.cumulative_net_to_par)}
                    </span>
                    <span className="ml-2 text-[#6a8870] text-xs sm:hidden">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex justify-center">
                      <ScorePips rounds={entry.rounds} countedN={countedN} />
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <PayToggle
                        seasonId={seasonId}
                        playerId={entry.player_id}
                        initialPaid={payments[entry.player_id] ?? false}
                      />
                    </td>
                  )}
                  <td className="pl-3 pr-4 py-3.5 text-center text-[#6a8870] text-xs hidden sm:table-cell">
                    {isExpanded ? "▲" : "▼"}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-t border-[#2d5035]">
                    <td colSpan={5} className="bg-[#1a3520] py-3 overflow-hidden">
                      <div className="overflow-x-auto px-4">
                      <table className="text-sm w-full min-w-[340px]">
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
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
