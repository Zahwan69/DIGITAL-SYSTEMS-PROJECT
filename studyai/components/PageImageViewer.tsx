"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Props = {
  paperId: string;
  initialPage?: number | null;
  onClose: () => void;
};

function PageImage({ paperId, page }: { paperId: string; page: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!cancelled) setError("Session expired.");
        return;
      }
      try {
        const response = await fetch(`/api/papers/${paperId}/page-image?page=${page}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          if (!cancelled) setError("Page preview unavailable.");
          return;
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setError("Page preview unavailable.");
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            void load();
            return;
          }
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paperId, page]);

  return (
    <div
      ref={containerRef}
      data-page={page}
      className="relative w-full bg-surface"
      // Reserve roughly A4 portrait aspect so the scroll container has
      // a known total height before each page image loads.
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Page ${page} of the original paper`}
          className="block h-full w-full object-contain"
          draggable={false}
        />
      ) : error ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-danger">
          {error}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-text-muted">
          Loading page {page}…
        </div>
      )}
    </div>
  );
}

export function PageImageViewer({ paperId, initialPage, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visiblePage, setVisiblePage] = useState<number>(initialPage ?? 1);
  const [lastInitialPage, setLastInitialPage] = useState<number | null>(initialPage ?? null);

  // Adjust visible page when parent requests a jump.
  if (initialPage !== lastInitialPage) {
    setLastInitialPage(initialPage ?? null);
    if (initialPage && initialPage > 0) {
      setVisiblePage(initialPage);
    }
  }

  // Fetch total page count.
  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const response = await fetch(`/api/papers/${paperId}/page-image?info=1`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = (await response.json().catch(() => ({}))) as {
          pageCount?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setError(
            data.error ??
              "Original page preview is unavailable. Try refreshing or ask your teacher."
          );
          return;
        }
        if (typeof data.pageCount === "number") setPageCount(data.pageCount);
      } catch {
        if (!cancelled) {
          setError("Original page preview is unavailable. Try refreshing or ask your teacher.");
        }
      }
    }
    void loadCount();
    return () => {
      cancelled = true;
    };
  }, [paperId]);

  // Scroll to the initial page when it changes (e.g. user clicks "Open at
  // page N" on a question card).
  useEffect(() => {
    if (!initialPage || initialPage < 1) return;
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-page="${initialPage}"]`
    );
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialPage, pageCount]);

  // Track the most-visible page so the header indicator stays meaningful.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !pageCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            const pageAttr = entry.target.getAttribute("data-page");
            if (pageAttr) bestPage = Number.parseInt(pageAttr, 10);
          }
        }
        if (bestPage !== null && bestRatio > 0.25) {
          setVisiblePage(bestPage);
        }
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );
    const nodes = container.querySelectorAll("[data-page]");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pageCount]);

  return (
    <aside
      className="fixed inset-0 z-40 flex flex-col bg-surface lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:h-screen lg:self-start lg:bg-transparent"
      aria-label="Original paper viewer"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-sm lg:rounded-t-xl">
        <span className="tabular-nums text-text-muted">
          Page {visiblePage}
          {pageCount ? ` / ${pageCount}` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close viewer"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface-alt lg:rounded-b-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {error ? (
          <p className="m-4 rounded-md border border-border bg-surface p-3 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {!pageCount && !error ? (
          <p className="m-4 text-xs text-text-muted">Loading PDF…</p>
        ) : null}
        {pageCount
          ? Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <PageImage key={page} paperId={paperId} page={page} />
            ))
          : null}
      </div>
    </aside>
  );
}
