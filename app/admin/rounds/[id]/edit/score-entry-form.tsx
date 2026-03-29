"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Player = { player_id: string; display_name: string };
type HoleScore = { hole_number: number; par: number; score: number };
type ExistingScorecard = {
  id: string;
  player_id: string;
  total_score: number | null;
  course_handicap: number | null;
  hole_scores: HoleScore[];
};
type CourseHole = { hole_number: number; par: number };

const DEFAULT_PARS = [4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 4, 3, 4, 5, 4, 3, 4, 5];

export default function ScoreEntryForm({
  roundId,
  courseHoles,
  players,
  existingScorecards,
}: {
  roundId: string;
  coursePar: number;
  courseHoles: CourseHole[];
  players: Player[];
  existingScorecards: ExistingScorecard[];
}) {
  const supabase = createClient();
  const router = useRouter();

  // Build canonical par per hole from course configuration
  const holePars: Record<number, number> = {};
  for (let i = 1; i <= 18; i++) {
    const configured = courseHoles.find((h) => h.hole_number === i);
    holePars[i] = configured?.par ?? DEFAULT_PARS[i - 1] ?? 4;
  }

  const existingMap = new Map(existingScorecards.map((sc) => [sc.player_id, sc]));

  const [selectedPlayer, setSelectedPlayer] = useState<string>(
    players[0]?.player_id ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseHandicap, setCourseHandicap] = useState<number | null>(
    existingMap.get(players[0]?.player_id ?? "")?.course_handicap ?? null
  );

  function getInitialScores(): Record<number, number> {
    const ex = existingMap.get(selectedPlayer);
    const scores: Record<number, number> = {};
    for (let i = 1; i <= 18; i++) {
      scores[i] = ex?.hole_scores.find((h) => h.hole_number === i)?.score ?? 0;
    }
    return scores;
  }

  const [scores, setScores] = useState<Record<number, number>>(getInitialScores);

  function handlePlayerChange(playerId: string) {
    setSelectedPlayer(playerId);
    const ex = existingMap.get(playerId);
    const newScores: Record<number, number> = {};
    for (let i = 1; i <= 18; i++) {
      newScores[i] = ex?.hole_scores.find((h) => h.hole_number === i)?.score ?? 0;
    }
    setScores(newScores);
    setCourseHandicap(ex?.course_handicap ?? null);
  }

  const totalScore = Object.values(scores).reduce((s, v) => s + (v || 0), 0);
  const totalPar = Object.values(holePars).reduce((s, p) => s + p, 0);
  const netScore = totalScore > 0 && courseHandicap !== null ? totalScore - courseHandicap : null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { data: sc, error: scError } = await supabase
        .from("scorecards")
        .upsert(
          {
            round_id: roundId,
            player_id: selectedPlayer,
            total_score: totalScore,
            course_handicap: courseHandicap,
          },
          { onConflict: "round_id,player_id" }
        )
        .select()
        .single();

      if (scError) throw scError;

      const holeScoreRows = Object.entries(scores).map(([hole, score]) => ({
        scorecard_id: sc.id,
        hole_number: parseInt(hole),
        par: holePars[parseInt(hole)] ?? 4,
        score,
      }));

      const { error: hsError } = await supabase
        .from("hole_scores")
        .upsert(holeScoreRows, { onConflict: "scorecard_id,hole_number" });

      if (hsError) throw hsError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scores.");
    } finally {
      setSaving(false);
    }
  }

  const front9 = Array.from({ length: 9 }, (_, i) => i + 1);
  const back9 = Array.from({ length: 9 }, (_, i) => i + 10);

  const hasCourseHoles = courseHoles.length > 0;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!hasCourseHoles && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 text-yellow-300 rounded-lg px-4 py-3 text-sm">
          No hole pars configured for this course. Using default pars.{" "}
          <a href="/admin/courses" className="underline hover:text-yellow-200">
            Set them up →
          </a>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedPlayer}
          onChange={(e) => handlePlayerChange(e.target.value)}
          className="bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
        >
          {players.map((p) => (
            <option key={p.player_id} value={p.player_id}>
              {p.display_name}
              {existingMap.has(p.player_id) ? " ✓" : ""}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#9ab8a0] whitespace-nowrap">Course HCP</label>
          <input
            type="number"
            value={courseHandicap ?? ""}
            onChange={(e) =>
              setCourseHandicap(e.target.value === "" ? null : parseInt(e.target.value))
            }
            min={0}
            max={54}
            placeholder="—"
            className="w-16 text-center text-sm bg-[#1a3520] border border-[#2d5035] text-white rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-semibold text-white">
            Gross: {totalScore || "—"} ({totalScore - totalPar > 0 ? "+" : ""}
            {totalScore ? totalScore - totalPar : "—"})
          </span>
          {netScore !== null && (
            <span className="text-sm font-semibold text-[#d4af37]">
              Net: {netScore}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || totalScore === 0}
            type="button"
            className="px-4 py-2 bg-[#d4af37] text-[#1a3520] rounded-lg text-sm font-bold hover:bg-[#e8c84a] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Scores"}
          </button>
        </div>
      </div>

      {/* Score grid */}
      {[front9, back9].map((holes, halfIndex) => (
        <div key={halfIndex} className="overflow-x-auto">
          <p className="text-xs font-semibold text-[#9ab8a0] uppercase tracking-wide mb-2">
            {halfIndex === 0 ? "Front 9" : "Back 9"}
          </p>
          <table className="text-sm border-collapse w-full min-w-max">
            <thead>
              <tr className="bg-[#1a3520]">
                <th className="border border-[#2d5035] px-3 py-2 text-left font-medium text-[#9ab8a0] w-16">
                  Hole
                </th>
                {holes.map((h) => (
                  <th
                    key={h}
                    className="border border-[#2d5035] px-2 py-2 text-center font-medium text-[#9ab8a0] w-12"
                  >
                    {h}
                  </th>
                ))}
                <th className="border border-[#2d5035] px-3 py-2 text-center font-medium text-[#9ab8a0] w-14">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#2d5035] px-3 py-2 font-medium text-[#9ab8a0] bg-[#1a3520]">
                  Par
                </td>
                {holes.map((h) => (
                  <td
                    key={h}
                    className="border border-[#2d5035] px-2 py-2 text-center text-[#9ab8a0] bg-[#1a3520]"
                  >
                    {holePars[h]}
                  </td>
                ))}
                <td className="border border-[#2d5035] px-3 py-2 text-center font-medium text-[#9ab8a0] bg-[#1a3520]">
                  {holes.reduce((s, h) => s + holePars[h], 0)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#2d5035] px-3 py-2 font-medium text-white bg-[#1a3520]">
                  Score
                </td>
                {holes.map((h) => {
                  const score = scores[h] ?? 0;
                  const par = holePars[h];
                  return (
                    <td key={h} className="border border-[#2d5035] px-1 py-1 bg-[#243d2a]">
                      <input
                        type="number"
                        value={score || ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [h]: parseInt(e.target.value) || 0,
                          }))
                        }
                        min={1}
                        max={15}
                        placeholder="—"
                        className={`w-full text-center text-sm font-semibold focus:outline-none rounded py-1 bg-transparent ${
                          score === 0
                            ? "text-[#4a6850]"
                            : score < par
                            ? "text-red-400"
                            : score === par
                            ? "text-[#9ab8a0]"
                            : "text-blue-400"
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="border border-[#2d5035] px-3 py-2 text-center font-bold text-white bg-[#1a3520]">
                  {holes.reduce((s, h) => s + (scores[h] || 0), 0) || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
