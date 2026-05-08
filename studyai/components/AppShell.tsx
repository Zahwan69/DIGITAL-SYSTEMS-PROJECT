"use client";

import { useEffect, useState } from "react";

import { FloatingNavbar } from "@/components/aceternity/floating-navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(data?.role ?? "student");
    }
    void load();
  }, []);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <FloatingNavbar authenticated role={role} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          <div className="flex min-h-full w-full min-w-0 flex-col">
            <div className="flex min-w-0 flex-1 flex-col px-6 pt-28">
              <div className="mx-auto w-full max-w-6xl flex-1 min-w-0">{children}</div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
