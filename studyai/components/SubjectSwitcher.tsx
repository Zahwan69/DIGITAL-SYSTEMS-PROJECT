"use client";

import { ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lastTeacherSubjectId";

type SubjectRow = {
  id: string;
  name: string;
  syllabus_code: string | null;
  level: string | null;
};

export function SubjectSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const subjectParam = searchParams.get("subject")?.trim() || "";

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/teacher/subjects", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (res.ok) setSubjects(json.subjects ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    if (!loaded || subjects.length === 0) return;
    if (subjectParam) return;
    void Promise.resolve().then(() => {
      const last = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (last && subjects.some((s) => s.id === last)) {
        const next = new URLSearchParams(searchParams.toString());
        next.set("subject", last);
        router.replace(`${pathname}?${next.toString()}`);
      }
    });
  }, [loaded, pathname, router, searchParams, subjectParam, subjects]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = useMemo(() => {
    if (!subjectParam) return null;
    return subjects.find((s) => s.id === subjectParam) ?? null;
  }, [subjectParam, subjects]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        (s.syllabus_code ?? "").toLowerCase().includes(t) ||
        (s.level ?? "").toLowerCase().includes(t)
    );
  }, [q, subjects]);

  function pick(id: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (id) {
      next.set("subject", id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    } else {
      next.delete("subject");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
    setQ("");
  }

  if (!loaded && subjects.length === 0) {
    return (
      <div className="mb-3 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
        Subject filter…
      </div>
    );
  }

  if (subjects.length === 0) {
    return null;
  }

  const label = current
    ? `${current.name}${current.syllabus_code ? ` · ${current.syllabus_code}` : ""}`
    : "All subjects";

  return (
    <div ref={rootRef} className="relative isolate">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-text transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[state=open]:shadow-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-state={open ? "open" : "closed"}
      >
        <span className="truncate font-medium">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-1 cursor-default rounded-md border border-border bg-surface py-1 shadow-lg ring-1 ring-border/60"
          role="presentation"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subjects…"
              className="min-h-0 flex-1 cursor-text border-0 bg-transparent py-1 text-sm text-text outline-none placeholder:text-text-muted"
              aria-label="Filter subjects"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto overscroll-contain py-0.5" role="listbox">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!subjectParam}
                className={cn(
                  "w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-accent-soft/30",
                  !subjectParam && "bg-accent-soft/40 text-text"
                )}
                onClick={() => pick(null)}
              >
                All subjects
              </button>
            </li>
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={subjectParam === s.id}
                  className={cn(
                    "w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-accent-soft/30",
                    subjectParam === s.id && "bg-accent-soft/40 text-text"
                  )}
                  onClick={() => pick(s.id)}
                >
                  <span className="font-medium">{s.name}</span>
                  {s.syllabus_code ? (
                    <span className="ml-1 text-text-muted">· {s.syllabus_code}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
