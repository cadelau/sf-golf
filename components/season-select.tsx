"use client";

import { useRouter, usePathname } from "next/navigation";

export type SeasonOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function SeasonSelect({
  seasons,
  selectedId,
}: {
  seasons: SeasonOption[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (seasons.length <= 1) return null;

  return (
    <select
      value={selectedId}
      onChange={(e) => {
        const season = seasons.find((s) => s.id === e.target.value);
        router.push(season?.is_active ? pathname : `${pathname}?season=${e.target.value}`);
      }}
      className="bg-[#1a3520] text-white text-sm border border-[#2d5035] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#4a7a50] cursor-pointer"
    >
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {s.is_active ? "" : " (Archived)"}
        </option>
      ))}
    </select>
  );
}
