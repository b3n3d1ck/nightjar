"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/nav";
import { DEMO_FINDINGS } from "@/lib/demo";
import { severityMeta } from "@/components/ui";
import { SEVERITY_LABEL } from "@/lib/types";

export const OPEN_PALETTE_EVENT = "nightjar:open-palette";

type Item =
  | { kind: "page"; label: string; hint: string; href: string }
  | { kind: "finding"; label: string; hint: string; href: string; sev: keyof typeof severityMeta };

const PAGE_ITEMS: Item[] = NAV_ITEMS.map((n) => ({
  kind: "page",
  label: n.label,
  hint: n.hint,
  href: n.href,
}));

const FINDING_ITEMS: Item[] = DEMO_FINDINGS.map((f) => ({
  kind: "finding",
  label: f.title,
  hint: `${f.target} · ${f.id}`,
  href: `/findings?focus=${f.id}`,
  sev: f.severity,
}));

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const openRef = React.useRef(false);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (i: Item) =>
      !q || i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q);
    const pages = PAGE_ITEMS.filter(match);
    const findings = FINDING_ITEMS.filter(match);
    return { pages, findings, flat: [...pages, ...findings] };
  }, [query]);

  // open via Cmd/Ctrl+K and via the topbar button event
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) close();
        else setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [close]);

  // DOM-only side effects while open: lock scroll and focus the input.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function run(i: Item) {
    close();
    router.push(i.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const n = results.flat.length;
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (n ? (a + 1) % n : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (n ? (a - 1 + n) % n : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results.flat[active];
      if (item) run(item);
    }
  }

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let idx = -1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-4 pt-[12vh]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="animate-overlay absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="animate-pop relative w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or a finding…"
            aria-label="Search pages and findings"
            className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-subtle sm:block">
            ESC
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {results.flat.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-fg-subtle">
              Nothing matches “{query}”.
            </li>
          ) : (
            <>
              {results.pages.length > 0 && (
                <Group label="Pages">
                  {results.pages.map((i) => {
                    idx++;
                    return (
                      <Row key={i.href} item={i} idx={idx} active={active === idx} onRun={run} onHover={setActive} />
                    );
                  })}
                </Group>
              )}
              {results.findings.length > 0 && (
                <Group label="Findings">
                  {results.findings.map((i) => {
                    idx++;
                    return (
                      <Row key={i.href} item={i} idx={idx} active={active === idx} onRun={run} onHover={setActive} />
                    );
                  })}
                </Group>
              )}
            </>
          )}
        </ul>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3" aria-hidden />
            <ArrowDown className="size-3" aria-hidden /> navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" aria-hidden /> open
          </span>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <ul>{children}</ul>
    </li>
  );
}

function Row({
  item,
  idx,
  active,
  onRun,
  onHover,
}: {
  item: Item;
  idx: number;
  active: boolean;
  onRun: (i: Item) => void;
  onHover: (idx: number) => void;
}) {
  return (
    <li role="option" aria-selected={active} data-idx={idx}>
      <button
        type="button"
        onClick={() => onRun(item)}
        onMouseMove={() => onHover(idx)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
          active ? "bg-surface-2" : "",
        )}
      >
        <span
          className={cn(
            "flex size-2 shrink-0 rounded-full",
            item.kind === "finding" ? severityMeta[item.sev].dot : "bg-accent",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-fg">{item.label}</span>
          <span className="tnum block truncate text-xs text-fg-subtle">{item.hint}</span>
        </span>
        {item.kind === "finding" && (
          <span className={cn("text-[11px]", severityMeta[item.sev].text)}>
            {SEVERITY_LABEL[item.sev]}
          </span>
        )}
      </button>
    </li>
  );
}
