import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "San Francisco Golf",
  description: "Weekly golf league",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let memberCount = 0;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    memberCount = count ?? 0;
  }

  return (
    <html lang="en" className="bg-[#1a3520]">
      <body className="min-h-screen bg-[#1a3520]">
        {user && <Nav profile={profile} memberCount={memberCount} />}
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
