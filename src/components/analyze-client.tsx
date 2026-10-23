"use client";

import * as React from "react";
import { Link2, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, SeverityBadge } from "@/components/ui";
import { analyzeUrl } from "@/lib/analyze/url";

const concernMeta = {
  clear: { label: "No strong indicators", cls: "text-success", Icon: ShieldCheck },
  low: { label: "Minor indicators", cls: "text-sev-low", Icon: ShieldAlert },
  medium: { label: "Suspicious indicators", cls: "text-sev-medium", Icon: ShieldAlert },
  high: { label: "High concern", cls: "text-sev-critical", Icon: ShieldAlert },
} as const;

export function AnalyzeClient() {
  const [input, setInput] = React.useState("");
  const result = React.useMemo(() => (input.trim() ? analyzeUrl(input) : null), [input]);

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <label htmlFor="analyze-url" className="mb-1.5 block text-sm font-medium text-fg">
          URL or domain
        </label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            id="analyze-url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="paypal.com@secure-login.tk/verify"
            className="tnum h-11 w-full rounded-md border border-border bg-surface-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          Pure, offline analysis — nothing is fetched or sent anywhere. Indicators
          are clues, not proof a site is malicious.
        </p>
      </Card>

      {result && !result.valid && (
        <Card className="p-4 text-sm text-fg-muted">{result.error}</Card>
      )}

      {result && result.valid && (
        <div className="animate-rise space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              {(() => {
                const m = concernMeta[result.concern];
                const Icon = m.Icon;
                return (
                  <>
                    <Icon className={cn("size-5", m.cls)} aria-hidden />
                    <span className={cn("font-medium", m.cls)}>{m.label}</span>
                    <span className="ml-auto text-xs text-fg-subtle">
                      {result.indicators.length} indicator
                      {result.indicators.length === 1 ? "" : "s"}
                    </span>
                  </>
                );
              })()}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <Meta label="Scheme" value={result.scheme ?? "—"} />
              <Meta label="Hostname" value={result.hostname ?? "—"} />
              <Meta label="Raw IP host" value={result.isIp ? "yes" : "no"} />
              <Meta label="Punycode (IDN)" value={result.punycode ? "yes" : "no"} />
              <Meta label="Userinfo in URL" value={result.hasUserinfo ? "yes" : "no"} />
              <Meta label="Subdomain depth" value={String(result.subdomainDepth ?? 0)} />
            </dl>
          </Card>

          {result.indicators.length === 0 ? (
            <Card className="p-4 text-sm text-fg-muted">
              No lookalike or obfuscation indicators found. That is not a guarantee
              of safety — always confirm the real destination before trusting a link.
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {result.indicators.map((i) => (
                <li key={i.id}>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <SeverityBadge severity={i.severity} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{i.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{i.detail}</p>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
