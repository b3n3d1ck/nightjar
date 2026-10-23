import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Radar, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  PageHeader,
  DemoNotice,
  SeverityBadge,
  buttonClass,
  severityMeta,
} from "@/components/ui";
import { DEMO_FINDINGS, DEMO_SCANS, totalCounts } from "@/lib/demo";
import { SEVERITY_ORDER, SEVERITY_LABEL, type Severity } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  const counts = totalCounts(DEMO_SCANS.filter((s) => s.status === "completed"));
  const open = DEMO_FINDINGS.filter((f) => f.status === "open");
  const topFindings = [...open]
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    )
    .slice(0, 4);
  const recent = DEMO_SCANS.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Current posture across the sample targets, with the findings that need attention first."
        action={
          <Link href="/scans" className={buttonClass("primary", "sm")}>
            <Radar className="size-4" aria-hidden />
            Scans
          </Link>
        }
      />

      <DemoNotice className="mb-6" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SEVERITY_ORDER.map((sev) => (
          <SeverityTile key={sev} severity={sev} count={counts[sev]} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">Needs attention</h2>
            <Link
              href="/findings"
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
            >
              All findings <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {topFindings.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/findings?focus=${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <SeverityBadge severity={f.severity} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {f.title}
                    </span>
                    <span className="tnum block truncate text-xs text-fg-subtle">
                      {f.target} · {f.id}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-fg-subtle"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">Recent scans</h2>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                {s.status === "completed" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                ) : s.status === "failed" ? (
                  <XCircle className="size-4 shrink-0 text-danger" aria-hidden />
                ) : (
                  <Radar className="size-4 shrink-0 text-info" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{s.target}</span>
                  <span className="tnum block text-xs text-fg-subtle">
                    {formatDateTime(s.startedAt)}
                    {s.status === "completed" && ` · ${formatDuration(s.durationMs)}`}
                  </span>
                </span>
                <span className="tnum text-xs capitalize text-fg-muted">
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function SeverityTile({ severity, count }: { severity: Severity; count: number }) {
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Icon className={`size-4 ${m.text}`} aria-hidden />
        <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden />
      </div>
      <p className="tnum mt-3 text-2xl font-semibold text-fg">{count}</p>
      <p className="text-xs text-fg-muted">{SEVERITY_LABEL[severity]}</p>
    </Card>
  );
}
