"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/leaderboard", label: "Standings" },
  { href: "/players", label: "Roster" },
];

export default function Nav({
  profile,
  memberCount,
}: {
  profile: Profile | null;
  memberCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <header className="bg-[#162d1c] border-b border-[#2d5035]">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">⛳</span>
          <div>
            <p className="text-[#d4af37] font-bold text-xl leading-tight tracking-tight font-serif italic">
              San Francisco Golf
            </p>
            <p className="text-[#6a8870] text-[10px] uppercase tracking-widest leading-none">
              Weekly Golf{memberCount ? ` · ${memberCount} Members` : ""}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <p className="text-white text-sm font-medium leading-tight">
                  {profile.display_name}
                </p>
                <p className="text-[#6a8870] text-xs leading-tight">
                  {profile.is_admin ? "Commissioner" : "Member"}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#d4af37] text-[#1a3520] flex items-center justify-center text-sm font-bold flex-shrink-0">
                {initials}
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-lg border border-[#2d5035] text-[#9ab8a0] text-sm hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Out
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                pathname === link.href
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[#9ab8a0] hover:text-white hover:border-[#2d5035]"
              )}
            >
              {link.label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                pathname.startsWith("/admin")
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[#9ab8a0] hover:text-white hover:border-[#2d5035]"
              )}
            >
              Manage
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
