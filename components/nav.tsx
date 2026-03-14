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
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Nav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="bg-green-800 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
            ⛳ SF Golf
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-green-700 text-white"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-green-700 text-white"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-green-200 text-sm hidden sm:block">
              {profile.display_name}
            </span>
          )}
          <button
            onClick={signOut}
            className="text-sm text-green-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
