import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "SF Golf League",
  description: "Weekly golf league for SF friends",
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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {user && <Nav profile={profile} />}
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
