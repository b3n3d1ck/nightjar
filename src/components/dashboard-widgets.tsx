"use client";

import * as React from "react";
import { Card, severityMeta } from "@/components/ui";
import { useStatusOverrides } from "@/lib/store";
import { DEMO_FINDINGS } from "@/lib/demo";
import {
  SEVERITY_ORDER,
  SEVERITY_LABEL,
  STATUS_LABEL,
  type FindingStatus,
  type Severity,
} from "@/lib/types";

const STATUS_TONE: Record<FindingStatus, { bar: string; text: string }> = {
  remediated: { bar: "bg-success", text: "text-success" },
  accepted: { bar: "bg-fg-subtle", text: "text-fg-subtle" },
  reviewing: { bar: "bg-info", text: "text-info" },
  open: { bar: "bg-sev-high", text: "text-sev-high" },
};

export function RemediationProgress() {
  const overrides = useStatusOverrides();
  const counts: Record<FindingStatus, number> = {
    open: 0,
    reviewing: 0,
    remediated: 0,
    accepted: 0,
  };
  for (const f of DEMO_FINDINGS) counts[overrides[f.id] ?? f.status]++;
  const total = DEMO_FINDINGS.length;
  const resolved = counts.remediated + counts.accepted;
  const pct = Math.round((resolved / total) * 100);
  const order: FindingStatus[] = ["remediated", "accepted", "reviewing", "open"];

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg">Remediation progress</h2>
        <span className="tnum text-sm text-fg-muted">
          <span className="text-fg">{resolved}</span> / {total} resolved
        </span>
      </div>

      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {order.map((s) =>
          counts[s] > 0 ? (
            <div
              key={s}
              className={STATUS_TONE[s].bar}
              style={{ width: `${(counts[s] / total) * 100}%` }}
              title={`${STATUS_LABEL[s]}: ${counts[s]}`}
            />
          ) : null,
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="tnum text-2xl font-semibold text-fg">{pct}%</span>
        <span className="text-xs text-fg-subtle">updates as you triage</span>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
        {order.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${STATUS_TONE[s].bar}`} aria-hidden />
            <span className="text-fg-muted">{STATUS_LABEL[s]}</span>
            <span className="tnum ml-auto text-fg">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SeverityChart() {
  const counts = SEVERITY_ORDER.map((s) => ({
    sev: s,
    n: DEMO_FINDINGS.filter((f) => f.severity === s).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  const summary = counts.map((c) => `${SEVERITY_LABEL[c.sev]} ${c.n}`).join(", ");

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-fg">Severity distribution</h2>
      <div className="mt-3 space-y-2" role="img" aria-label={`Severity distribution: ${summary}`}>
        {counts.map(({ sev, n }) => (
          <Bar key={sev} sev={sev} n={n} max={max} />
        ))}
      </div>
    </Card>
  );
}

function Bar({ sev, n, max }: { sev: Severity; n: number; max: number }) {
  const m = severityMeta[sev];
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-2.5" aria-hidden>
      <span className="flex w-20 shrink-0 items-center gap-1.5 text-xs text-fg-muted">
        <Icon className={`size-3.5 ${m.text}`} />
        {SEVERITY_LABEL[sev]}
      </span>
      <span className="relative h-5 flex-1 overflow-hidden rounded bg-surface-2">
        <span
          className={`absolute inset-y-0 left-0 rounded ${m.dot}`}
          style={{ width: `${Math.max(n ? 6 : 0, (n / max) * 100)}%` }}
        />
      </span>
      <span className="tnum w-5 shrink-0 text-right text-xs text-fg">{n}</span>
    </div>
  );
}
