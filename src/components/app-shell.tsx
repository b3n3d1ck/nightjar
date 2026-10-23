"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bird, Menu, X, Search, CircleUser } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 rounded-md px-1 py-1 focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent">
        <Bird className="size-4" aria-hidden />
      </span>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight text-fg">
          NIGHTJAR
        </span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-[var(--dur-fast)]",
              active
                ? "bg-surface-2 text-fg"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-0.5 shrink-0 rounded-full transition-colors",
                active ? "bg-accent" : "bg-transparent",
              )}
              aria-hidden
            />
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium leading-tight">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);

  // lock scroll + Escape to close while drawer is open; restore focus on close
  React.useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <ScopeNote />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur sm:px-4">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)] lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="lg:hidden">
            <Brand compact />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/findings"
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              <Search className="size-4" aria-hidden />
              <span className="hidden sm:inline">Search findings</span>
            </Link>
            <button
              type="button"
              aria-label="Account"
              className="flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            >
              <CircleUser className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="animate-overlay fixed inset-0 z-[var(--z-drawer)] bg-black/55"
          />
          <div className="animate-panel fixed inset-y-0 left-0 z-[var(--z-overlay)] flex w-[min(17rem,85vw)] flex-col border-r border-border bg-surface px-3 py-4">
            <div className="flex items-center justify-between px-2">
              <Brand />
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavLinks onNavigate={close} />
            </div>
            <ScopeNote />
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeNote() {
  return (
    <div className="mt-3 rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <p className="text-xs font-medium text-fg">Authorized scope only</p>
      <p className="mt-0.5 text-xs leading-snug text-fg-subtle">
        Run assessments only against systems you own or are permitted to test.
      </p>
    </div>
  );
}
