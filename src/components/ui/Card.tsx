import type { HTMLAttributes, ReactNode } from "react";

/** Lovable 卡片：微抬升表面 + 邊線 + 極淺陰影 */
export function Card({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface-raised [box-shadow:var(--shadow-card)] ${className}`}
      {...rest}
    />
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong/40 px-6 py-16 text-center">
      {icon && <div className="text-text-faint [&>svg]:size-10">{icon}</div>}
      <p className="text-lg font-medium text-text">{title}</p>
      {hint && <p className="max-w-sm text-sm text-text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** 功能色小標籤（wayfinding 用；色彩不作為唯一訊息載體） */
export function Tag({
  color = "var(--text-muted)",
  children,
}: {
  color?: string;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium"
      style={{ color }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}
