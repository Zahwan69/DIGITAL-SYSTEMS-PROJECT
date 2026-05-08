"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
  marksAvailable: number;
  onSubmitted: (result: MarkResult) => void;
  revealed: boolean;
  existingResult?: MarkResult | null;
};

function scoreColour(pct: number): string {
  if (pct >= 80) return "text-green-700";
  if (pct >= 50) return "text-yellow-700";
  return "text-red-700";
}

export function AnswerForm({
  questionId,
  marksAvailable,
  onSubmitted,
  revealed,
  existingResult = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [resultImageBroken, setResultImageBroken] = useState(false);
  const MAX_HINTS = 3;
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
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

      const data = (await response.json()) as { hint?: string; error?: string };
      if (data.hint) {
        setHints((prev) => [...prev, data.hint!]);
      }
    } catch {
      // silently fail - hints are optional, not critical
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

      const data = (await response.json()) as MarkResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Marking failed. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setOpen(false);
      clearSelectedAttachment();
      onSubmitted(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (revealed && existingResult) {
    return (
      <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${scoreColour(existingResult.percentage)}`}>
            {existingResult.score} / {existingResult.maxScore}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            +{existingResult.xpEarned} XP
            {existingResult.newStreak > 1 ? ` · ${existingResult.newStreak}-day streak` : ""}
          </span>
        </div>

        {existingResult.answerText ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Your answer
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{existingResult.answerText}</p>
          </div>
        ) : null}

        {existingResult.answerImageUrl ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
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

        <p className="text-sm text-slate-700">{existingResult.feedback}</p>

        {existingResult.paperCompleted && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            Paper complete! +100 XP
          </div>
        )}

        {existingResult.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Strengths</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {existingResult.strengths.map((s, i) => (
                <li key={`${s}-${i}`}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {existingResult.improvements.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">To improve</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {existingResult.improvements.map((imp, i) => (
                <li key={`${imp}-${i}`}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
            Show model answer
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-xs text-slate-700">
            {existingResult.modelAnswer}
          </p>
        </details>
      </div>
    );
  }

  if (!revealed && submitted) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Answer submitted ✓
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        Attempt this question
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
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

      {hints.length > 0 && (
        <ol className="space-y-1 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          {hints.map((hint, i) => (
            <li key={i} className="text-xs text-indigo-800">
              <span className="font-semibold">Hint {i + 1}:</span> {hint}
            </li>
          ))}
        </ol>
      )}

      {!submitted && (
        <button
          type="button"
          onClick={handleGetHint}
          disabled={hintLoading || hints.length >= MAX_HINTS}
          className="text-xs text-indigo-600 underline hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          {hintLoading
            ? "Thinking..."
            : hints.length >= MAX_HINTS
              ? "No more hints available"
              : `Get a hint (${MAX_HINTS - hints.length} remaining)`}
        </button>
      )}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || (!answer.trim() && !selectedAttachment)}>
          {loading ? "Marking with AI..." : "Submit for marking"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setAnswer("");
            setError(null);
            setHints([]);
            clearSelectedAttachment();
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
