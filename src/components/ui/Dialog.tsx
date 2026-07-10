"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  title,
  description,
  onClose,
  children,
  maxWidth = "max-w-2xl",
  panelClassName = "",
  scrimClassName = "bg-black/55",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  panelClassName?: string;
  scrimClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = previousFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[autofocus], " + FOCUSABLE);
    requestAnimationFrame(() => first?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <div className={`absolute inset-0 ${scrimClassName}`} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative max-h-[90dvh] w-full ${maxWidth} overflow-y-auto rounded-xl border border-control bg-surface-raised p-6 [box-shadow:var(--shadow-raised)] ${panelClassName}`}
      >
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
