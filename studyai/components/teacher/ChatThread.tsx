"use client";

import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

export function ChatThread({ messages, loading }: { messages: ChatMessage[]; loading?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      {messages.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm leading-relaxed text-text-muted">
          Start a new class chat. Answers are limited to the class snapshot StudyAI sends with each request.
        </div>
      ) : null}
      {messages
        .filter((message) => message.role !== "system")
        .map((message) => (
          <article
            key={message.id}
            className={cn(
              "rounded-xl border border-border p-4 text-sm leading-relaxed",
              message.role === "assistant" ? "bg-accent-soft text-text" : "ml-auto max-w-[85%] bg-surface text-text"
            )}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </article>
        ))}
      {loading ? <div className="rounded-xl bg-accent-soft p-4 text-sm text-text-muted">Thinking...</div> : null}
    </div>
  );
}
