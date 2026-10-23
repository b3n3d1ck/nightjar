"use client";

import * as React from "react";
import { X } from "lucide-react";

/**
 * Right-side sheet used for detail panels. Fits the viewport on phones,
 * caps its width on desktop, closes on Escape / overlay click, and restores
 * focus to the element that opened it. Entrance motion respects
 * prefers-reduced-motion via the shared CSS animation classes.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // move focus into the panel
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="animate-overlay fixed inset-0 z-[var(--z-overlay)] bg-black/55"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-panel fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full flex-col border-l border-border bg-surface outline-none sm:w-[min(34rem,92vw)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-border px-4 py-3 sm:px-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
