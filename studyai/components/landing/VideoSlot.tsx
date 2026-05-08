export function VideoSlot({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-surface-alt px-6 text-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Guide video</p>
          <p className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">{title}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{caption}</p>
    </div>
  );
}
