import type { Metadata } from "next";
import Link from "next/link";
import { Radar, CheckCircle2, XCircle, PlugZap } from "lucide-react";
import { Card, PageHeader, SeverityBadge, DemoTag } from "@/components/ui";
import { DEMO_SCANS } from "@/lib/demo";
import { SEVERITY_ORDER, type Scan } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Scans" };

export default function ScansPage() {
  return (
    <>
      <PageHeader
        title="Scans"
        description="Assessment runs and how their findings break down. Newest first."
      />

      <Card className="mb-6 flex items-start gap-3 border-dashed p-4">
        <PlugZap className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-fg">This is run history (demo)</p>
          <p className="mt-1 text-fg-muted">
            These are demonstration runs. Live scanning happens on the{" "}
            <Link href="/scan" className="text-accent hover:underline">
              Scan a URL
            </Link>{" "}
            page — results there are real, not stored here yet. Deeper engines
            (ghostmap, shellhound) run from the command line.
          </p>
        </div>
      </Card>

      <ul className="flex flex-col gap-3">
        {DEMO_SCANS.map((s) => (
          <li key={s.id}>
            <ScanRow scan={s} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ScanRow({ scan }: { scan: Scan }) {
  const total = SEVERITY_ORDER.reduce((n, k) => n + scan.counts[k], 0);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <StatusIcon status={scan.status} />
          <div className="min-w-0">
            <p className="tnum truncate font-medium text-fg">{scan.target}</p>
            <p className="tnum mt-0.5 text-xs text-fg-subtle">
              {scan.id} · {formatDateTime(scan.startedAt)}
              {scan.status === "completed" &&
                ` · ${formatDuration(scan.durationMs)} · ${scan.requests} requests`}
            </p>
          </div>
        </div>
        <DemoTag />
      </div>

      {scan.status === "completed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {total === 0 ? (
            <span className="text-xs text-fg-muted">No findings recorded.</span>
          ) : (
            SEVERITY_ORDER.filter((k) => scan.counts[k] > 0).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <SeverityBadge severity={k} />
                <span className="tnum text-xs text-fg-muted">{scan.counts[k]}</span>
              </span>
            ))
          )}
        </div>
      ) : scan.status === "failed" ? (
        <p className="mt-3 text-xs text-danger">
          Run failed before completion. In a real deployment the engine error and
          partial progress would appear here.
        </p>
      ) : null}
    </Card>
  );
}

function StatusIcon({ status }: { status: Scan["status"] }) {
  if (status === "completed")
    return <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Completed" />;
  if (status === "failed")
    return <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-label="Failed" />;
  return <Radar className="mt-0.5 size-5 shrink-0 text-info" aria-label={status} />;
}
