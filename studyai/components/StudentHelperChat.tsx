"use client";

import { MessageCircle, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type HelperMode =
  | "hint"
  | "explain"
  | "guide"
  | "check"
  | "feedback"
  | "reveal_answer";

type BlockedReason =
  | "assigned_paper_no_reveal"
  | "already_revealed"
  | "attempt_limit_exceeded";

type HelperResponse = {
  assistantMessage: string;
  answerRevealed: boolean;
  revealAllowed: boolean;
  isAssigned: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
  hintLevel?: 1 | 2 | 3;
  blockedReason?: BlockedReason;
  error?: string;
};

export type QuestionSummary = {
  id: string;
  question_number: string;
  page_start: number | null;
  attemptsUsed: number;
  attemptsRemaining: number;
  answerRevealed: boolean;
  hasFeedback: boolean;
};

type Props = {
  questions: QuestionSummary[];
  isAssigned: boolean;
  draftAnswerByQuestion: Record<string, string>;
  onOpenViewerAt?: (page: number | null) => void;
  /** Notify parent when reveal usage / attempt counters change. */
  onUsageChanged?: (questionId: string, answerRevealed: boolean) => void;
};

export type StudentHelperChatHandle = {
  openWithQuestion: (questionId: string) => void;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  badge?: BlockedReason | "revealed";
};

const STORAGE_KEY = "studyai_student_helper_y";
const DEFAULT_BOTTOM_GAP = 16;
const POPUP_HEIGHT = 390;
const MIN_TOP_DESKTOP = 16;
const MIN_TOP_MOBILE = 72;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStoredY(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredY(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage not available — fall back silently.
  }
}

function clampY(y: number, minTop: number) {
  if (typeof window === "undefined") return y;
  const max = Math.max(minTop, window.innerHeight - POPUP_HEIGHT - DEFAULT_BOTTOM_GAP);
  if (y < minTop) return minTop;
  if (y > max) return max;
  return y;
}

function readSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("studyai:sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

export const StudentHelperChat = forwardRef<StudentHelperChatHandle, Props>(function StudentHelperChat(
  {
    questions,
    isAssigned,
    draftAnswerByQuestion,
    onOpenViewerAt,
    onUsageChanged,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "intro", role: "assistant", text: "How may I help you?" },
  ]);
  const [pending, setPending] = useState(false);
  const [composer, setComposer] = useState("");
  const [hintCountByQuestion, setHintCountByQuestion] = useState<Record<string, number>>({});
  const [popupY, setPopupY] = useState<number>(() => {
    const stored = readStoredY();
    if (stored !== null) return stored;
    if (typeof window === "undefined") return 120;
    return Math.max(MIN_TOP_DESKTOP, window.innerHeight - POPUP_HEIGHT - 80);
  });
  const [isMobile, setIsMobile] = useState(false);
  const [draggingFrom, setDraggingFrom] = useState<{ pointerY: number; popupY: number } | null>(
    null
  );
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Default to the first question with attempts left, falling back to the
  // first question in the list.
  useEffect(() => {
    if (!activeQuestionId && questions.length > 0) {
      const firstOpen = questions.find((q) => q.attemptsRemaining > 0);
      setActiveQuestionId((firstOpen ?? questions[0]).id);
    }
  }, [activeQuestionId, questions]);

  // Track viewport size for mobile vs desktop behaviour.
  useEffect(() => {
    function refresh() {
      setIsMobile(window.innerWidth < 1024);
    }
    refresh();
    window.addEventListener("resize", refresh);
    return () => window.removeEventListener("resize", refresh);
  }, []);

  // Re-clamp position when viewport resizes.
  useEffect(() => {
    function onResize() {
      setPopupY((y) => clampY(y, isMobile ? MIN_TOP_MOBILE : MIN_TOP_DESKTOP));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isMobile]);

  // Auto-scroll the message list to the bottom on new messages.
  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, pending]);

  // Drag handlers (desktop only).
  const handleDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (isMobile) return;
      if ((e.target as HTMLElement).closest("[data-helper-nodrag]")) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setDraggingFrom({ pointerY: e.clientY, popupY });
    },
    [isMobile, popupY]
  );
  const handleDragMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingFrom) return;
      e.preventDefault();
      const delta = e.clientY - draggingFrom.pointerY;
      const next = clampY(draggingFrom.popupY + delta, MIN_TOP_DESKTOP);
      setPopupY(next);
    },
    [draggingFrom]
  );
  const handleDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingFrom) return;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }
      setDraggingFrom(null);
      writeStoredY(popupY);
    },
    [draggingFrom, popupY]
  );

  useImperativeHandle(
    ref,
    () => ({
      openWithQuestion(questionId: string) {
        setActiveQuestionId(questionId);
        setIsOpen(true);
      },
    }),
    []
  );

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId) ?? null,
    [activeQuestionId, questions]
  );

  function pushMessage(message: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { id: makeId(), ...message }]);
  }

  async function sendToHelper(opts: {
    mode: HelperMode;
    message?: string;
    label?: string;
  }) {
    if (!activeQuestion || pending) return;

    const hintCount = (hintCountByQuestion[activeQuestion.id] ?? 0) + (opts.mode === "hint" ? 1 : 0);

    pushMessage({
      role: "user",
      text: opts.label ?? opts.message ?? labelForMode(opts.mode),
    });
    setPending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        pushMessage({ role: "assistant", text: "Session expired. Please sign in again." });
        return;
      }
      const response = await fetch("/api/student/help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          message: opts.message ?? "",
          mode: opts.mode,
          currentDraftAnswer: draftAnswerByQuestion[activeQuestion.id] ?? "",
          hintCount: opts.mode === "hint" ? hintCount : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as HelperResponse;
      if (!response.ok) {
        pushMessage({
          role: "assistant",
          text: data.error ?? "I couldn't generate a response. Please try again.",
        });
        return;
      }

      if (opts.mode === "hint") {
        setHintCountByQuestion((prev) => ({ ...prev, [activeQuestion.id]: hintCount }));
      }

      pushMessage({
        role: "assistant",
        text: data.assistantMessage,
        badge: data.blockedReason ?? (data.answerRevealed ? "revealed" : undefined),
      });

      if (data.answerRevealed && onUsageChanged) {
        onUsageChanged(activeQuestion.id, true);
      }
    } catch {
      pushMessage({
        role: "assistant",
        text: "Network error reaching the helper. Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  function handleSubmitComposer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = composer.trim();
    if (!trimmed) return;
    setComposer("");
    void sendToHelper({ mode: "hint", message: trimmed, label: trimmed });
  }

  // Anchored to the same viewport-left position regardless of sidebar state.
  // The page reserves equivalent room on the left (via lg:ml-48 when the
  // sidebar collapses) so the questions stay put while the helper stays put.
  const horizontalLeftClass = "lg:left-4";
  // Sidebar uses z-50; on desktop we float above it so the overlap is visible.
  const stackingClass = "z-40 lg:z-[60]";

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open study helper"
        className={`fixed bottom-4 left-4 ${horizontalLeftClass} ${stackingClass} inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-text shadow-md hover:bg-surface-alt`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Help
      </button>
    );
  }

  if (isMobile) {
    return (
      <aside
        className="fixed inset-x-0 bottom-0 z-40 flex h-[70vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-xl"
        aria-label="Study helper"
      >
        <HelperHeader
          questions={questions}
          activeQuestionId={activeQuestion?.id ?? null}
          onChangeQuestion={setActiveQuestionId}
          isAssigned={isAssigned}
          activeQuestion={activeQuestion}
          onClose={() => setIsOpen(false)}
          draggable={false}
        />
        <HelperBody
          ref={messageListRef}
          messages={messages}
          pending={pending}
          activeQuestion={activeQuestion}
        />
        <HelperFooter
          activeQuestion={activeQuestion}
          isAssigned={isAssigned}
          pending={pending}
          composer={composer}
          setComposer={setComposer}
          onSubmit={handleSubmitComposer}
          onQuick={(mode, label) => void sendToHelper({ mode, label })}
          onViewSource={() =>
            activeQuestion?.page_start && onOpenViewerAt?.(activeQuestion.page_start)
          }
        />
      </aside>
    );
  }

  return (
    <aside
      ref={popupRef}
      className={`fixed left-4 ${horizontalLeftClass} ${stackingClass} flex w-80 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl`}
      style={{ top: popupY, height: POPUP_HEIGHT, maxHeight: "55vh" }}
      aria-label="Study helper"
    >
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <HelperHeader
          questions={questions}
          activeQuestionId={activeQuestion?.id ?? null}
          onChangeQuestion={setActiveQuestionId}
          isAssigned={isAssigned}
          activeQuestion={activeQuestion}
          onClose={() => setIsOpen(false)}
          draggable
        />
      </div>
      <HelperBody
        ref={messageListRef}
        messages={messages}
        pending={pending}
        activeQuestion={activeQuestion}
      />
      <HelperFooter
        activeQuestion={activeQuestion}
        isAssigned={isAssigned}
        pending={pending}
        composer={composer}
        setComposer={setComposer}
        onSubmit={handleSubmitComposer}
        onQuick={(mode, label) => void sendToHelper({ mode, label })}
        onViewSource={() =>
          activeQuestion?.page_start && onOpenViewerAt?.(activeQuestion.page_start)
        }
      />
    </aside>
  );
});

function labelForMode(mode: HelperMode): string {
  switch (mode) {
    case "hint":
      return "Give me a hint";
    case "explain":
      return "Explain this question";
    case "guide":
      return "Guide me step by step";
    case "check":
      return "Check my thinking";
    case "feedback":
      return "Explain my feedback";
    case "reveal_answer":
      return "Reveal the answer";
  }
}

function HelperHeader({
  questions,
  activeQuestionId,
  onChangeQuestion,
  isAssigned,
  activeQuestion,
  onClose,
  draggable,
}: {
  questions: QuestionSummary[];
  activeQuestionId: string | null;
  onChangeQuestion: (id: string) => void;
  isAssigned: boolean;
  activeQuestion: QuestionSummary | null;
  onClose: () => void;
  draggable: boolean;
}) {
  const heading = activeQuestion
    ? `Helping with Q${activeQuestion.question_number}`
    : "Study helper";
  return (
    <div className="space-y-2 border-b border-border bg-surface-alt px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{heading}</p>
          {draggable ? (
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              drag to move
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-helper-nodrag
          onClick={onClose}
          aria-label="Close helper"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor="helper-question-select">
          Active question
        </label>
        <select
          id="helper-question-select"
          data-helper-nodrag
          value={activeQuestionId ?? ""}
          onChange={(e) => onChangeQuestion(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text"
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              Q{q.question_number}
            </option>
          ))}
        </select>
        <Badge tone={isAssigned ? "warning" : "neutral"}>
          {isAssigned ? "Assigned work: hints only" : "Self-practice"}
        </Badge>
        {activeQuestion ? (
          <Badge tone="neutral">
            Attempt {activeQuestion.attemptsUsed} of 3
          </Badge>
        ) : null}
        {activeQuestion?.answerRevealed ? (
          <Badge tone="warning">Answer already revealed</Badge>
        ) : null}
      </div>
    </div>
  );
}

const HelperBody = forwardRef<
  HTMLDivElement,
  {
    messages: Message[];
    pending: boolean;
    activeQuestion: QuestionSummary | null;
  }
>(function HelperBody({ messages, pending, activeQuestion }, ref) {
  return (
    <div
      ref={ref}
      className="flex-1 space-y-2 overflow-y-auto bg-surface px-3 py-3 text-sm"
      data-helper-nodrag
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {pending ? (
        <div className="flex items-center gap-1 px-3 py-2 text-text-muted" aria-live="polite">
          <span className="sr-only">Assistant is typing…</span>
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-text-muted [animation-delay:-0.3s]" />
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-text-muted [animation-delay:-0.15s]" />
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-text-muted" />
        </div>
      ) : null}
      {!activeQuestion ? (
        <p className="text-xs text-text-muted">Pick a question above to get started.</p>
      ) : null}
    </div>
  );
});

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent text-text-on-accent"
            : "border border-border bg-surface-alt text-text"
        }`}
      >
        {message.text}
        {message.badge ? <BadgeForReason badge={message.badge} /> : null}
      </div>
    </div>
  );
}

function BadgeForReason({ badge }: { badge: BlockedReason | "revealed" }) {
  let text = "";
  if (badge === "assigned_paper_no_reveal") text = "Reveal blocked: assigned work";
  else if (badge === "already_revealed") text = "Reveal blocked: already revealed";
  else if (badge === "attempt_limit_exceeded") text = "Attempts exhausted";
  else if (badge === "revealed") text = "Answer revealed";
  if (!text) return null;
  return (
    <span className="ml-1 inline-flex items-center rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
      {text}
    </span>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "neutral" | "warning" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/40 bg-accent-soft text-text"
      : "border-border bg-surface text-text-muted";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

function HelperFooter({
  activeQuestion,
  isAssigned,
  pending,
  composer,
  setComposer,
  onSubmit,
  onQuick,
  onViewSource,
}: {
  activeQuestion: QuestionSummary | null;
  isAssigned: boolean;
  pending: boolean;
  composer: string;
  setComposer: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuick: (mode: HelperMode, label?: string) => void;
  onViewSource: () => void;
}) {
  const canCheckDraft = Boolean(activeQuestion);
  const hasFeedback = Boolean(activeQuestion?.hasFeedback);
  const canReveal = Boolean(activeQuestion) && !isAssigned && !activeQuestion?.answerRevealed;
  const showViewSource = Boolean(activeQuestion?.page_start);

  return (
    <div className="border-t border-border bg-surface-alt px-3 py-2" data-helper-nodrag>
      <div className="flex flex-wrap gap-1.5">
        <QuickButton onClick={() => onQuick("hint")} disabled={pending || !activeQuestion}>
          Give me a hint
        </QuickButton>
        <QuickButton onClick={() => onQuick("explain")} disabled={pending || !activeQuestion}>
          Explain this question
        </QuickButton>
        <QuickButton onClick={() => onQuick("guide")} disabled={pending || !activeQuestion}>
          Guide me step by step
        </QuickButton>
        <QuickButton onClick={() => onQuick("check")} disabled={pending || !canCheckDraft}>
          Check my thinking
        </QuickButton>
        {hasFeedback ? (
          <QuickButton onClick={() => onQuick("feedback")} disabled={pending}>
            Explain my feedback
          </QuickButton>
        ) : null}
        {canReveal ? (
          <QuickButton onClick={() => onQuick("reveal_answer")} disabled={pending}>
            Reveal answer
          </QuickButton>
        ) : null}
        {showViewSource ? (
          <QuickButton onClick={onViewSource} disabled={pending}>
            View source page
          </QuickButton>
        ) : null}
      </div>
      <form className="mt-2 flex items-center gap-2" onSubmit={onSubmit}>
        <input
          type="text"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text placeholder:text-text-muted"
          disabled={pending || !activeQuestion}
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending || !activeQuestion || !composer.trim()}
        >
          Ask
        </Button>
      </form>
    </div>
  );
}

function QuickButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
