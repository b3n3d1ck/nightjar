"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PageHeader,
  DemoNotice,
  SeverityBadge,
  StatusBadge,
  DemoTag,
  EmptyState,
  severityMeta,
} from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { Sheet } from "@/components/sheet";
import {
  SEVERITY_ORDER,
  SEVERITY_LABEL,
  STATUS_LABEL,
  type Finding,
  type Severity,
  type FindingStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

const STATUSES: FindingStatus[] = ["open", "reviewing", "remediated", "accepted"];

export function FindingsClient({ findings }: { findings: Finding[] }) {
  const params = useSearchParams();
  const focus = params.get("focus");

  const [query, setQuery] = React.useState("");
  const [sev, setSev] = React.useState<Set<Severity>>(new Set());
  const [status, setStatus] = React.useState<Set<FindingStatus>>(new Set());
  const [selectedId, setSelectedId] = React.useState<string | null>(focus);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings
      .filter((f) => (sev.size ? sev.has(f.severity) : true))
      .filter((f) => (status.size ? status.has(f.status) : true))
      .filter((f) =>
        q
          ? [f.title, f.target, f.id, f.category].some((v) =>
              v.toLowerCase().includes(q),
            )
          : true,
      )
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
          b.lastSeen.localeCompare(a.lastSeen),
      );
  }, [findings, query, sev, status]);

  const selected = findings.find((f) => f.id === selectedId) ?? null;
  const hasFilters = query || sev.size || status.size;

  function toggle<T>(setFn: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function clearAll() {
    setQuery("");
    setSev(new Set());
    setStatus(new Set());
  }

  return (
    <>
      <PageHeader
        title="Findings"
        description="Review observations, understand the risk, and track remediation."
      />
      <DemoNotice className="mb-5" />

      {/* toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, target, ID…"
              aria-label="Search findings"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            />
          </div>
          <span className="tnum shrink-0 text-sm text-fg-muted">
            {filtered.length} of {findings.length}
          </span>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-fg-muted hover:border-border-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Severity
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_ORDER.map((s) => (
              <FilterChip
                key={s}
                active={sev.has(s)}
                onClick={() => toggle(setSev, s)}
                className={sev.has(s) ? cn(severityMeta[s].soft, severityMeta[s].text) : undefined}
              >
                {SEVERITY_LABEL[s]}
              </FilterChip>
            ))}
          </div>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle sm:ml-3 sm:mt-0">
            Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <FilterChip key={s} active={status.has(s)} onClick={() => toggle(setStatus, s)}>
                {STATUS_LABEL[s]}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* results */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No findings match"
            description="Adjust the search or filters to widen the results."
          />
        ) : (
          <>
            {/* mobile: cards */}
            <ul className="flex flex-col gap-2 md:hidden">
              {filtered.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className="w-full rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SeverityBadge severity={f.severity} />
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-fg">{f.title}</p>
                    <p className="tnum mt-0.5 break-all text-xs text-fg-subtle">
                      {f.target} · {f.id}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            {/* desktop: table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-fg-subtle">
                    <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Finding</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Target</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Category</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-2"
                    >
                      <td className="px-4 py-3 align-top">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(f.id);
                          }}
                          className="text-left font-medium text-fg hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                        >
                          {f.title}
                        </button>
                        <span className="tnum mt-0.5 block text-xs text-fg-subtle">
                          {f.id}
                        </span>
                      </td>
                      <td className="tnum px-4 py-3 align-top text-fg-muted">
                        <span className="break-all">{f.target}</span>
                      </td>
                      <td className="px-4 py-3 align-top text-fg-muted">{f.category}</td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={f.status} />
                      </td>
                      <td className="tnum px-4 py-3 align-top text-fg-muted">
                        {formatDate(f.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.id : ""}
        footer={
          selected ? (
            <div className="flex items-center justify-between gap-2">
              <DemoTag />
              <CopyButton
                label="Copy summary"
                value={`[${selected.id}] ${SEVERITY_LABEL[selected.severity]} — ${selected.title}\nTarget: ${selected.target}\nObservation: ${selected.observation}\nRecommendation: ${selected.recommendation}`}
              />
            </div>
          ) : null
        }
      >
        {selected ? <FindingDetail finding={selected} /> : null}
      </Sheet>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)]",
        active
          ? "border-border-strong bg-surface-3 text-fg"
          : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

function FindingDetail({ finding }: { finding: Finding }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <StatusBadge status={finding.status} />
          <span className="text-xs text-fg-subtle">{finding.category}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-fg">{finding.title}</h3>
        <p className="tnum mt-1 break-all text-sm text-fg-muted">{finding.target}</p>
      </div>

      <Field label="Observation" body={finding.observation} />
      <Field label="Risk" body={finding.risk} />
      <Field label="Recommendation" body={finding.recommendation} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            Evidence
          </h4>
          <CopyButton value={finding.evidence.location} label="Copy URL" />
        </div>
        <div className="space-y-2 rounded-md border border-border bg-surface-2 p-3">
          <EvidenceRow label="Location" value={finding.evidence.location} />
          {finding.evidence.request ? (
            <EvidenceRow label="Request" value={finding.evidence.request} />
          ) : null}
          {finding.evidence.response ? (
            <EvidenceRow label="Response" value={finding.evidence.response} />
          ) : null}
          {finding.evidence.snippet ? (
            <div>
              <p className="mb-1 text-xs text-fg-subtle">Excerpt</p>
              <pre className="tnum overflow-x-auto whitespace-pre-wrap break-words rounded border border-border bg-bg p-2 text-xs text-fg-muted">
                {finding.evidence.snippet}
              </pre>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-fg-subtle">First seen</dt>
          <dd className="tnum text-fg-muted">{formatDate(finding.firstSeen)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Last seen</dt>
          <dd className="tnum text-fg-muted">{formatDate(finding.lastSeen)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </h4>
      <p className="text-sm leading-relaxed text-fg">{body}</p>
    </div>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span className="tnum break-all text-xs text-fg">{value}</span>
    </div>
  );
}
