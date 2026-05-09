"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/Dropzone";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

export type MarkResult = {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  xpEarned: number;
  newStreak: number;
  paperCompleted?: boolean;
  answerText?: string;
  answerImagePath?: string | null;
  answerImageUrl?: string | null;
  needsTeacherReview?: boolean;
};

type Props = {
  questionId: string;
  questionText: string;
  marksAvailable: number;
  onSubmitted: (result: MarkResult) => void;
  revealed: boolean;
  existingResult?: MarkResult | null;
};

type MultipleChoiceOption = {
  label: string;
  text?: string;
};

function scoreColour(pct: number): string {
  if (pct >= 50) return "text-text";
  return "text-danger";
}

const DEFAULT_MCQ_OPTIONS: MultipleChoiceOption[] = ["A", "B", "C", "D"].map((label) => ({
  label,
}));

function labelsAreSequential(options: MultipleChoiceOption[]) {
  const expectedLabels = ["A", "B", "C", "D"].slice(0, options.length);
  return options.every((option, index) => option.label === expectedLabels[index]);
}

function extractInlineMultipleChoiceOptions(questionText: string): MultipleChoiceOption[] {
  const normalized = questionText.replace(/\s+/g, " ").trim();
  const labelPattern = /(?:^|\s)(?:\(?([A-D])\)|([A-D])[.)])\s+/gi;
  const matches = Array.from(normalized.matchAll(labelPattern))
    .map((match) => ({
      label: (match[1] ?? match[2] ?? "").toUpperCase(),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }))
    .filter((match) => match.label);

  if (matches.length < 2) return [];

  const options = matches.map((match, index) => {
    const next = matches[index + 1];
    return {
      label: match.label,
      text: normalized.slice(match.end, next?.start ?? normalized.length).trim(),
    };
  });

  return labelsAreSequential(options) && options.every((option) => option.text)
    ? options
    : [];
}

function extractMultipleChoiceOptions(
  questionText: string,
  marksAvailable: number
): MultipleChoiceOption[] {
  const seen = new Set<string>();
  const options: MultipleChoiceOption[] = [];
  const lines = questionText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match =
      line.match(/^\(?([A-D])\)\s+(.+)$/i) ||
      line.match(/^([A-D])[.)]\s+(.+)$/i) ||
      line.match(/^([A-D])\s{2,}(.+)$/i);

    if (!match) continue;
    const label = match[1]!.toUpperCase();
    const text = match[2]!.trim();
    if (seen.has(label) || !text) continue;
    seen.add(label);
    options.push({ label, text });
  }

  if (options.length >= 2 && labelsAreSequential(options)) return options;

  const inlineOptions = extractInlineMultipleChoiceOptions(questionText);
  if (inlineOptions.length >= 2) return inlineOptions;

  const hasAllOptionLabels = ["A", "B", "C", "D"].every((label) =>
    new RegExp(`(?:^|\\s|\\()${label}(?:[.)]|\\)|\\s)`, "i").test(questionText)
  );
  const looksLikeMcqPrompt = /\b(which|choose|select|answer|option)\b/i.test(questionText);

  if (marksAvailable <= 2 && hasAllOptionLabels && looksLikeMcqPrompt) {
    return DEFAULT_MCQ_OPTIONS;
  }

  return [];
}

export function AnswerForm({
  questionId,
  questionText,
  marksAvailable,
  onSubmitted,
  revealed,
  existingResult = null,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [resultImageBroken, setResultImageBroken] = useState(false);
  const MAX_HINTS = 3;
  const multipleChoiceOptions = useMemo(
    () => extractMultipleChoiceOptions(questionText, marksAvailable),
    [marksAvailable, questionText]
  );
  const isMultipleChoice = multipleChoiceOptions.length > 0;
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
  const allowedAttachmentTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  function clearSelectedAttachment() {
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setSelectedAttachment(null);
    setAttachmentPreviewUrl(null);
    setAttachmentError(null);
  }

  function handleAttachmentChange(file: File | null) {
    setAttachmentError(null);
    if (!file) {
      clearSelectedAttachment();
      return;
    }
    if (!allowedAttachmentTypes.has(file.type)) {
      clearSelectedAttachment();
      setAttachmentError("Please attach a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      clearSelectedAttachment();
      setAttachmentError("Attachment must be 8 MB or smaller.");
      return;
    }
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setSelectedAttachment(file);
    setAttachmentPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  async function handleGetHint() {
    setHintLoading(true);
    setHintError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setHintError("Session expired. Please sign in again.");
      setHintLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ questionId }),
      });

      const data = (await response.json().catch(() => ({}))) as { hint?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate a hint right now.");
      }
      if (data.hint) {
        setHints((prev) => [...prev, data.hint!]);
      } else {
        throw new Error("Could not generate a hint right now.");
      }
    } catch (error) {
      setHintError(error instanceof Error ? error.message : "Could not generate a hint right now.");
    } finally {
      setHintLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!answer.trim() && !selectedAttachment) {
      setError("Please provide text or attach a file.");
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      let answerImagePath: string | null = null;
      if (selectedAttachment) {
        const extensionByMime: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "application/pdf": "pdf",
        };
        const extension = extensionByMime[selectedAttachment.type];
        if (!extension) {
          setError("Unsupported file type. Please use JPG, PNG, WEBP, or PDF.");
          setLoading(false);
          return;
        }

        const uploadPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("answer-images")
          .upload(uploadPath, selectedAttachment, {
            contentType: selectedAttachment.type,
            upsert: false,
          });
        if (uploadError) {
          setError(`File upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }
        answerImagePath = uploadPath;
      }

      const response = await fetch("/api/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          questionId,
          answerText: answer.trim(),
          answerImagePath,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as MarkResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Marking failed. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      clearSelectedAttachment();
      onSubmitted(data);
      window.dispatchEvent(new CustomEvent("studyai:profile-updated"));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (revealed && existingResult) {
    return (
      <div className="mt-4 space-y-4 rounded-lg border border-border bg-surface-alt p-4">
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${scoreColour(existingResult.percentage)}`}>
            {existingResult.score} / {existingResult.maxScore}
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text">
            +{existingResult.xpEarned} XP
            {existingResult.newStreak > 1 ? ` · ${existingResult.newStreak}-day streak` : ""}
          </span>
        </div>

        {existingResult.answerText ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Your answer
            </p>
            <p className="whitespace-pre-wrap text-sm text-text">{existingResult.answerText}</p>
          </div>
        ) : null}

        {existingResult.answerImageUrl ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Your uploaded file
            </p>
            {existingResult.answerImagePath?.toLowerCase().endsWith(".pdf") ? (
              <a
                href={existingResult.answerImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text underline-offset-4 hover:underline"
              >
                Open uploaded PDF
              </a>
            ) : !resultImageBroken ? (
              <Image
                src={existingResult.answerImageUrl}
                alt="Your uploaded answer image"
                width={480}
                height={320}
                loading="lazy"
                unoptimized
                className="h-32 w-auto rounded-md border border-border bg-surface object-contain"
                onError={() => setResultImageBroken(true)}
              />
            ) : (
              <p className="text-xs text-text-muted">Uploaded image unavailable.</p>
            )}
          </div>
        ) : null}

        {existingResult.needsTeacherReview ? (
          <div className="rounded-lg border border-warning/30 bg-accent-soft px-3 py-2 text-xs font-medium text-text">
            This mark is provisional because the answer includes a diagram, graph, PDF, or handwritten
            working. A teacher should review it before treating the score as final.
          </div>
        ) : null}

        <p className="text-sm text-text">{existingResult.feedback}</p>

        {existingResult.paperCompleted && (
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-success">
            Paper complete! +100 XP
          </div>
        )}

        {existingResult.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Strengths</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-text">
              {existingResult.strengths.map((s, i) => (
                <li key={`${s}-${i}`}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {existingResult.improvements.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">To improve</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-text">
              {existingResult.improvements.map((imp, i) => (
                <li key={`${imp}-${i}`}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

        <details className="rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-muted hover:text-text">
            Show model answer
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-xs text-text">
            {existingResult.modelAnswer}
          </p>
        </details>
      </div>
    );
  }

  if (!revealed && submitted) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-success">
        Answer submitted ✓
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
        <p className="text-xs text-text-muted">Need a nudge? Ask Gemini for a short hint.</p>
        {!submitted && (
          <button
            type="button"
            onClick={handleGetHint}
            disabled={hintLoading || hints.length >= MAX_HINTS}
            className="text-xs font-medium text-text underline hover:text-text-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
          >
            {hintLoading
              ? "Thinking..."
              : hints.length >= MAX_HINTS
                ? "No more hints"
                : `Get hint (${MAX_HINTS - hints.length} left)`}
          </button>
        )}
      </div>

      {hints.length > 0 && (
        <ol className="space-y-1 rounded-lg border border-border bg-surface-alt p-3">
          {hints.map((hint, i) => (
            <li key={i} className="text-xs text-text">
              <span className="font-semibold">Hint {i + 1}:</span> {hint}
            </li>
          ))}
        </ol>
      )}

      {hintError ? <p className="text-xs text-danger">{hintError}</p> : null}

      {isMultipleChoice ? (
        <fieldset className="space-y-2 rounded-lg border border-border bg-surface p-3">
          <legend className="px-1 text-xs font-medium text-text-muted">Choose your answer</legend>
          <div className="flex gap-2">
            {multipleChoiceOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                disabled={loading}
                aria-label={`Choose answer ${option.label}`}
                onClick={() => {
                  setSelectedOption(option.label);
                  setAnswer(option.label);
                  setError(null);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selectedOption === option.label
                    ? "border-border-strong bg-accent text-text-on-accent"
                    : "border-border bg-surface-alt text-text hover:border-border-strong hover:bg-surface"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <Textarea
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setSelectedOption(null);
            }}
            placeholder={`Write your answer here (question is worth ${marksAvailable} mark${
              marksAvailable !== 1 ? "s" : ""
            })...`}
            rows={5}
            className="resize-y text-sm"
            disabled={loading}
          />
          <p className="text-xs text-text-muted">
            Typed answers are preferred. Attach an image or PDF only when the question needs a drawing,
            labelled diagram, graph, or handwritten working.
          </p>

          <div className="flex flex-col gap-2">
            <Dropzone
              compact
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
                "application/pdf": [".pdf"],
              }}
              disabled={loading}
              maxSize={MAX_ATTACHMENT_BYTES}
              onFilesAccepted={(picked) => handleAttachmentChange(picked[0] ?? null)}
              onFilesRejected={() => {
                clearSelectedAttachment();
                setAttachmentError("Please attach one JPG, PNG, WEBP, or PDF file up to 8 MB.");
              }}
              inputProps={{ capture: "environment" }}
              label="Attach working as an image or PDF (optional)"
              hint="Use this for drawings, labelled diagrams, graphs, or handwritten work"
              className="w-fit"
            />

            {attachmentPreviewUrl && selectedAttachment ? (
              <div className="flex items-start gap-3">
                <Image
                  src={attachmentPreviewUrl}
                  alt="Selected answer image preview"
                  width={480}
                  height={320}
                  unoptimized
                  className="h-32 w-auto rounded-md border border-border bg-surface object-contain"
                />
                <button
                  type="button"
                  onClick={clearSelectedAttachment}
                  className="inline-flex items-center gap-1 text-xs text-text-muted underline hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ) : null}

            {!attachmentPreviewUrl && selectedAttachment ? (
              <div className="flex w-fit items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text">
                <span>{selectedAttachment.name}</span>
                <button
                  type="button"
                  onClick={clearSelectedAttachment}
                  className="inline-flex items-center gap-1 text-text-muted underline hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ) : null}

            {attachmentError ? <p className="text-xs text-danger">{attachmentError}</p> : null}
          </div>
        </>
      )}

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || (!answer.trim() && !selectedAttachment)}>
          {loading ? "Marking with AI..." : "Submit for marking"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAnswer("");
            setSelectedOption(null);
            setError(null);
            setHints([]);
            setHintError(null);
            clearSelectedAttachment();
          }}
          disabled={loading}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
