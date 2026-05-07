import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { TeacherChatSurface } from "@/components/teacher/TeacherChatSurface";

export default function TeacherChatPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">Loading chat...</div>}>
        <TeacherChatSurface />
      </Suspense>
    </AppShell>
  );
}
