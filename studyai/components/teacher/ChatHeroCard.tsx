"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HoverBorderGradient } from "@/components/aceternity/hover-border-gradient";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type TeacherClass = {
  id: string;
  name: string;
};

const suggestions = [
  "How is 9A doing this week?",
  "Which topics are weakest in IGCSE Maths?",
  "Who needs help right now?",
];

export function ChatHeroCard() {
  const router = useRouter();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classId, setClassId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadClasses() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch("/api/teacher/classes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { classes?: TeacherClass[] };
      const rows = payload.classes ?? [];
      setClasses(rows);
      setClassId((current) => current || rows[0]?.id || "");
    }
    void loadClasses();
  }, []);

  function openChat(nextQuery = query) {
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    router.push(`/teacher/chat?${params.toString()}`);
  }

  return (
    <SpotlightCard className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Teacher AI</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">
            Ask AI about your class
          </h1>
          <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="h-10 rounded-[10px] border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {classes.length === 0 ? <option value="">No classes yet</option> : null}
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (classId) openChat();
              }}
              rows={2}
              placeholder="Ask about trends, weak topics, or students who need support."
              className="min-h-20 rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => openChat(suggestion)}
                disabled={!classId}
                className="disabled:opacity-50"
              >
                <HoverBorderGradient>{suggestion}</HoverBorderGradient>
              </button>
            ))}
          </div>
        </div>
        <Button type="button" onClick={() => openChat()} disabled={!classId}>
          Open chat
        </Button>
      </div>
    </SpotlightCard>
  );
}
