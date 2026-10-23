"use client";

import * as React from "react";
import Link from "next/link";
import { Bird, Github, Menu, X } from "lucide-react";
import { buttonClass } from "@/components/ui";

const SHELLHOUND = "https://github.com/b3n3d1ck/shellhound";

const SECTIONS: { href: string; label: string }[] = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "How it works" },
  { href: "#trust", label: "What it does" },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-accent-soft text-accent">
        <Bird className="size-4" aria-hidden />
      </span>
      <span className="font-display text-sm font-semibold tracking-[0.08em] text-fg">
        NIGHTJAR
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav
          className="ml-6 hidden items-center gap-1 md:flex"
          aria-label="Sections"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <a
            href={SHELLHOUND}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <Github className="size-4" aria-hidden />
            GitHub
          </a>
          <Link href="/dashboard" className={buttonClass("primary", "sm")}>
            Open workspace
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="ml-auto flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)] sm:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <div className="animate-fade border-t border-border bg-surface sm:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                {s.label}
              </a>
            ))}
            <a
              href={SHELLHOUND}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <Github className="size-4" aria-hidden /> GitHub
            </a>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={buttonClass("primary", "md", "mt-2")}
            >
              Open workspace
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
