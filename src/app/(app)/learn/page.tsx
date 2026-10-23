import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHeader, SeverityBadge } from "@/components/ui";
import type { Severity } from "@/lib/types";

export const metadata: Metadata = { title: "Learn" };

interface Topic {
  title: string;
  severity: Severity;
  what: string;
  why: string;
  fix: string;
}

const TOPICS: Topic[] = [
  {
    title: "Exposed .env and config files",
    severity: "critical",
    what: "A configuration file such as .env is reachable over HTTP and returns its contents.",
    why: "These files hold database passwords, app keys, and API tokens. Once downloadable, an attacker can often take over the application and its data.",
    fix: "Keep .env out of the web root, block dotfiles at the server, and rotate every secret that was exposed.",
  },
  {
    title: "Webshells and backdoors",
    severity: "critical",
    what: "A script that lets an attacker run commands or manage files on the server, usually planted through a weak upload or a vulnerable plugin.",
    why: "A webshell means code execution on the host. It is an incident, not a configuration bug — the attacker may already be inside.",
    fix: "Scan the filesystem for suspicious files, isolate anything found, review access logs for the entry point, and rotate credentials.",
  },
  {
    title: "Missing security headers",
    severity: "medium",
    what: "Responses omit headers like Content-Security-Policy, Strict-Transport-Security, or X-Content-Type-Options.",
    why: "Headers are a cheap layer of defence. Without a CSP, an injected script runs unrestricted; without HSTS, a downgrade to HTTP is easier.",
    fix: "Add the headers at the server or framework level. Start CSP from default-src 'self' and loosen it per real dependency.",
  },
  {
    title: "Insecure session cookies",
    severity: "high",
    what: "The session cookie is set without Secure, HttpOnly, or SameSite attributes.",
    why: "Without HttpOnly it is reachable from JavaScript, so an XSS flaw can steal the session; without Secure it can travel over plaintext.",
    fix: "Set Secure, HttpOnly, and SameSite=Lax on session cookies and serve the site only over HTTPS.",
  },
  {
    title: "Unsafe file upload handling",
    severity: "high",
    what: "An upload accepts files based on the client-supplied extension or MIME type only.",
    why: "If the server trusts what the browser claims, a disguised script can be uploaded and then executed — a common route to a webshell.",
    fix: "Validate by content (magic bytes), store files outside the web root, and disable script execution in the upload directory.",
  },
  {
    title: "Transport and HTTPS",
    severity: "low",
    what: "HTTP is served without redirecting to HTTPS, or TLS is outdated.",
    why: "Plaintext traffic can be read or modified on the network before any upgrade happens.",
    fix: "Force a 301 redirect to HTTPS, enable HSTS, and keep TLS at 1.2 or newer.",
  },
];

export default function LearnPage() {
  return (
    <>
      <PageHeader
        title="Learn"
        description="The weaknesses NIGHTJAR surfaces, what they mean, and how to close them. Plain explanations, no jargon for its own sake."
      />

      <div className="space-y-2.5">
        {TOPICS.map((t) => (
          <details
            key={t.title}
            className="group rounded-lg border border-border bg-surface transition-colors open:border-border-strong"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
              <SeverityBadge severity={t.severity} />
              <span className="min-w-0 flex-1 text-sm font-medium text-fg">
                {t.title}
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-fg-subtle transition-transform duration-[var(--dur)] group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-4 text-sm">
              <Para label="What it is" body={t.what} />
              <Para label="Why it matters" body={t.why} />
              <Para label="How to fix" body={t.fix} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

function Para({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-0.5 leading-relaxed text-fg">{body}</p>
    </div>
  );
}
