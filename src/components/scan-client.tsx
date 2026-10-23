"use client";

import * as React from "react";
import {
  ScanLine,
  Loader2,
  ShieldAlert,
  Globe,
  ChevronDown,
  AlertCircle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, Button, SeverityBadge, severityMeta, buttonClass } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { downloadText } from "@/lib/report";
import { SEVERITY_ORDER } from "@/lib/types";
import type { ScanResult, ScanFinding } from "@/lib/scan/types";

type State =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "done"; result: ScanResult }
  | { phase: "error"; message: string };

export function ScanClient() {
  const [url, setUrl] = React.useState("");
  const [authorized, setAuthorized] = React.useState(false);
  const [state, setState] = React.useState<State>({ phase: "idle" });

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !authorized) return;
    setState({ phase: "scanning" });
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), authorized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: "error", message: data.error ?? "The scan failed." });
      } else {
        setState({ phase: "done", result: data as ScanResult });
      }
    } catch {
      setState({ phase: "error", message: "Could not reach the scan service." });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <form onSubmit={run} className="space-y-4">
          <div>
            <label htmlFor="scan-url" className="mb-1.5 block text-sm font-medium text-fg">
              Target URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  id="scan-url"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-site.example"
                  className="tnum h-11 w-full rounded-md border border-border bg-surface-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!url.trim() || !authorized || state.phase === "scanning"}
                className="sm:w-auto"
              >
                {state.phase === "scanning" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Scanning…
                  </>
                ) : (
                  <>
                    <ScanLine className="size-4" aria-hidden />
                    Run scan
                  </>
                )}
              </Button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I own this target or have written authorization to test it. Passive
              GET requests only; internal and private addresses are rejected.
            </span>
          </label>
        </form>
      </Card>

      {state.phase === "scanning" && <Scanning />}
      {state.phase === "error" && <ErrorNote message={state.message} />}
      {state.phase === "done" && <Results result={state.result} />}
    </div>
  );
}

function Scanning() {
  return (
    <Card className="flex items-center gap-3 p-5">
      <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
      <div>
        <p className="text-sm font-medium text-fg" role="status" aria-live="polite">
          Running passive checks…
        </p>
        <p className="text-xs text-fg-subtle">
          Fetching the target, reading headers, and probing well-known paths.
        </p>
      </div>
    </Card>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <Card className="flex items-start gap-3 border-[color-mix(in_oklab,var(--danger)_40%,transparent)] p-4">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="text-sm font-medium text-fg">Scan did not run</p>
        <p className="mt-0.5 text-sm text-fg-muted" role="alert">
          {message}
        </p>
      </div>
    </Card>
  );
}

function Results({ result }: { result: ScanResult }) {
  const counts = SEVERITY_ORDER.map((s) => ({
    s,
    n: result.findings.filter((f) => f.severity === s).length,
  })).filter((c) => c.n > 0);

  function exportMarkdown() {
    const lines = [
      `# NIGHTJAR live scan — ${result.target}`,
      ``,
      `Scanned ${result.scannedAt} · scanner v${result.scannerVersion} · ${result.requests} requests · ${result.findings.length} findings`,
      `IP: ${result.ips.join(", ")}${result.server ? ` · Server: ${result.server}` : ""}`,
      ...(result.notes.length ? [``, `> Notes: ${result.notes.join(" ")}`] : []),
      ``,
      ...result.findings.flatMap((f) => [
        `## [${f.severity.toUpperCase()}] ${f.title}`,
        ``,
        `- ID: ${f.id}`,
        `- Category: ${f.category}`,
        `- Confidence: ${f.confidence}`,
        `- Location: ${f.evidence.location}`,
        ``,
        `**Observation.** ${f.observation}`,
        ``,
        `**Risk.** ${f.risk}`,
        ``,
        `**Recommendation.** ${f.recommendation}`,
        ...(f.references.length ? [``, `References: ${f.references.join(" , ")}`] : []),
        ``,
        `---`,
      ]),
    ];
    downloadText(
      `nightjar-scan-${new Date().toISOString().slice(0, 10)}.md`,
      lines.join("\n"),
    );
  }

  function exportJSON() {
    downloadText(
      `nightjar-scan-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(result, null, 2),
      "application/json",
    );
  }

  return (
    <div className="animate-rise space-y-5">
      {/* host */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <span className="inline-flex items-center gap-1 rounded border border-[color-mix(in_oklab,var(--success)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
              Live
            </span>
            {result.target}
          </h2>
          <span className="tnum text-xs text-fg-subtle">
            {result.requests} requests · {result.durationMs} ms
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Meta label="IP" value={result.ips.join(", ") || "—"} />
          <Meta label="Reverse DNS" value={result.reverseDns[0] ?? "—"} />
          <Meta label="Server" value={result.server ?? "—"} />
          <Meta label="Technology" value={result.tech.join(", ") || "—"} />
        </dl>
      </Card>

      {/* summary + export */}
      <div className="flex flex-wrap items-center gap-2">
        {counts.length === 0 ? (
          <span className="text-sm text-fg-muted">No issues surfaced by the passive checks.</span>
        ) : (
          counts.map(({ s, n }) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <SeverityBadge severity={s} />
              <span className="tnum text-xs text-fg-muted">{n}</span>
            </span>
          ))
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={exportMarkdown}
            disabled={result.findings.length === 0}
            className={buttonClass("secondary", "sm")}
          >
            <Download className="size-3.5" aria-hidden />
            Markdown
          </button>
          <button
            type="button"
            onClick={exportJSON}
            disabled={result.findings.length === 0}
            className={buttonClass("secondary", "sm")}
          >
            <Download className="size-3.5" aria-hidden />
            JSON
          </button>
        </div>
      </div>

      {result.notes.length > 0 && (
        <Card className="p-3 text-xs text-fg-muted">
          <span className="font-medium text-fg">Run notes: </span>
          {result.notes.join(" ")}
        </Card>
      )}

      {/* findings */}
      {result.findings.length > 0 && (
        <div className="space-y-2.5">
          {result.findings.map((f) => (
            <FindingRow key={f.id} f={f} />
          ))}
        </div>
      )}

      {/* accessible paths */}
      {result.paths.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <ShieldAlert className="size-4 text-fg-muted" aria-hidden />
            Accessible paths ({result.paths.length})
          </h3>
          <ul className="space-y-1">
            {result.paths.map((p) => (
              <li key={p.path} className="tnum flex items-center gap-2 text-xs">
                <span className="text-success">200</span>
                <span className="break-all text-fg">{p.path}</span>
                {p.title ? <span className="truncate text-fg-subtle">· {p.title}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-fg-subtle">
        Passive audit · GET only · a clean result is not a guarantee of security.
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="tnum truncate text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}

function FindingRow({ f }: { f: ScanFinding }) {
  const m = severityMeta[f.severity];
  return (
    <details className="group nj-card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
        <SeverityBadge severity={f.severity} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{f.title}</span>
          <span className="block truncate text-xs text-fg-subtle">
            {f.category} · {f.confidence}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform group-open:rotate-180", m.text)}
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3.5 text-sm">
        <Field label="Observation" body={f.observation} />
        <Field label="Risk" body={f.risk} />
        <Field label="Recommendation" body={f.recommendation} />
        {f.references.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              References
            </h4>
            <ul className="mt-0.5 space-y-0.5">
              {f.references.map((r) => (
                <li key={r}>
                  <a
                    href={r}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-accent hover:underline"
                  >
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="tnum text-[11px] text-fg-subtle">
          {f.id} · confidence: {f.confidence} · scanner v{f.scannerVersion}
        </p>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Evidence
            </h4>
            <CopyButton value={f.evidence.location} label="Copy URL" />
          </div>
          <div className="space-y-1 rounded-md border border-border bg-surface-2 p-3 text-xs">
            <p className="tnum break-all text-fg">{f.evidence.location}</p>
            {f.evidence.request ? <p className="tnum text-fg-muted">{f.evidence.request}</p> : null}
            {f.evidence.response ? <p className="tnum text-fg-muted">{f.evidence.response}</p> : null}
            {f.evidence.snippet ? (
              <pre className="tnum mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded border border-border bg-bg p-2 text-fg-muted">
                {f.evidence.snippet}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </details>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{label}</h4>
      <p className="mt-0.5 leading-relaxed text-fg">{body}</p>
    </div>
  );
}
