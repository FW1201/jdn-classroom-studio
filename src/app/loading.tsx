export default function Loading() {
  return (
    <div className="flex min-h-[55dvh] items-center justify-center px-4" role="status" aria-live="polite">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface-raised p-6 [box-shadow:var(--shadow-card)]">
        <div className="h-3 w-28 animate-pulse rounded-full bg-border-strong/30" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded-md bg-border-strong/25" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-border-strong/20" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-md bg-border-strong/20" />
        <span className="sr-only">正在準備課堂工作站…</span>
      </div>
    </div>
  );
}
