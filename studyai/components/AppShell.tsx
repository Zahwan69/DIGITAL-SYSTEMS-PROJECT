"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Navbar
        role={role}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <Sidebar open={sidebarOpen} role={role} />
        <div
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          <div className="flex min-h-full w-full min-w-0 flex-col">
            <div className="flex min-w-0 flex-1 flex-col px-6 pt-8">
              <div className="mx-auto w-full max-w-6xl flex-1 min-w-0">{children}</div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
