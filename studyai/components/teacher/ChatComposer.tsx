"use client";

import { ArrowUp, Loader2, Plus } from "lucide-react";
import { DragEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: (file: File) => void;
  uploading?: boolean;
  attachmentError?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function ChatComposer({
  value,
  onChange,
  onSend,
  onAttach,
  uploading,
  attachmentError,
  disabled,
  placeholder,
}: ChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 192)}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline. Cmd/Ctrl+Enter also sends
    // for users who learned the old behaviour.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSend();
    }
  }

  function handleFile(file: File | null | undefined) {
    setLocalError(null);
    if (!file || !onAttach) return;
    if (file.type !== "application/pdf") {
      setLocalError("Please attach a PDF file.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setLocalError("PDF must be 10 MB or smaller.");
      return;
    }
    onAttach(file);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!onAttach) return;
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!onAttach) return;
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!onAttach) return;
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!onAttach) return;
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  }

  const errorToShow = localError ?? attachmentError ?? null;

  return (
    <div className="shrink-0 border-t border-border bg-surface p-4">
      <div
        className="relative mx-auto max-w-3xl"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-text bg-surface-alt/95 text-sm font-medium text-text">
            Drop syllabus or teaching document here
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-sm">
          {onAttach ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  handleFile(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Attach a PDF document"
                title="Attach a syllabus or teaching document (PDF)"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:bg-surface-alt hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
              </button>
            </>
          ) : null}
          <textarea
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={placeholder ?? "Ask anything about this class…"}
            className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-text outline-none placeholder:text-text-muted disabled:opacity-60"
          />
          <Button
            type="button"
            size="sm"
            onClick={onSend}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {errorToShow ? (
          <p className="mt-1.5 px-2 text-xs text-danger">{errorToShow}</p>
        ) : null}
      </div>
    </div>
  );
}
