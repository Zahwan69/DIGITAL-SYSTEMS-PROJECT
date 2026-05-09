"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";

import { Hoverable } from "@/components/effects/Hoverable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChatListItem = {
  id: string;
  classId: string;
  className: string;
  title: string;
  lastMessageAt: string;
};

function groupLabel(date: string) {
  const then = new Date(date);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const diff = Math.round((startToday - startThen) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return "Earlier";
}

export function ChatSidebar({
  chats,
  activeChatId,
  onNewChat,
  onDeleteChat,
  deletingChatId,
}: {
  chats: ChatListItem[];
  activeChatId?: string;
  onNewChat: () => void;
  onDeleteChat?: (chat: ChatListItem) => void;
  deletingChatId?: string | null;
}) {
  const groups = chats.reduce<Record<string, ChatListItem[]>>((acc, chat) => {
    const key = `${chat.className} - ${groupLabel(chat.lastMessageAt)}`;
    acc[key] = [...(acc[key] ?? []), chat];
    return acc;
  }, {});

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-border bg-surface-alt p-3 lg:flex lg:flex-col">
      <Button type="button" className="w-full" onClick={onNewChat}>
        New chat
      </Button>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {Object.entries(groups).map(([group, rows]) => (
          <div key={group} className="mb-5">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-text-muted">{group}</p>
            <div className="space-y-1">
              {rows.map((chat) => (
                <Hoverable
                  key={chat.id}
                  disableMotion={activeChatId === chat.id}
                  className={cn(
                    "group flex items-start gap-1",
                    activeChatId === chat.id && "bg-accent-soft"
                  )}
                >
                  <Link
                    href={`/teacher/chat/${chat.id}`}
                    className={cn(
                      "block min-w-0 flex-1 px-3 py-2 text-sm text-text-muted",
                      activeChatId === chat.id && "text-text"
                    )}
                  >
                    <span className="line-clamp-1 font-medium">{chat.title}</span>
                    <span className="mt-0.5 block line-clamp-1 text-xs">{chat.className}</span>
                  </Link>
                  {onDeleteChat ? (
                    <button
                      type="button"
                      onClick={() => onDeleteChat(chat)}
                      disabled={deletingChatId === chat.id}
                      className="mr-1 mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted opacity-100 transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      aria-label={`Delete chat ${chat.title}`}
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </Hoverable>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
