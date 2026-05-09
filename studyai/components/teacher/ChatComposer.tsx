"use client";

import { ArrowUp } from "lucide-react";
import { KeyboardEvent, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({ value, onChange, onSend, disabled, placeholder }: ChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 192)}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-border bg-surface p-2 shadow-sm">
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder ?? "Ask about this class..."}
          className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-text outline-none placeholder:text-text-muted disabled:opacity-60"
        />
        <Button type="button" size="sm" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Send message">
          <ArrowUp className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
