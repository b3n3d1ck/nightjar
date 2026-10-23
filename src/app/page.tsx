import Link from "next/link";
import {
  Bird,
  ArrowRight,
  Terminal,
  FileSearch,
  ShieldCheck,
  BookOpen,
  Github,
} from "lucide-react";
import { buttonClass, SeverityBadge, StatusBadge, DemoTag } from "@/components/ui";

const GHOSTMAP = "https://github.com/b3n3d1ck/ghostmap";
const SHELLHOUND = "https://github.com/b3n3d1ck/shellhound";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                Security assessment workspace
              </p>
              <h1 className="mt-5 text-pretty text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl lg:text-5xl">
                Read web security findings as work, not noise.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-fg-muted">
                NIGHTJAR is a workspace for reviewing what a scan found: the raw
                observation, why it matters, and the fix. It separates evidence
                from interpretation, and keeps every assessment inside an
                authorized scope.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className={buttonClass("primary", "md")}>
                  Open the workspace
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a
                  href={SHELLHOUND}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass("secondary", "md")}
                >
                  <Github className="size-4" aria-hidden />
                  View the code
                </a>
              </div>
              <p className="mt-4 text-xs text-fg-subtle">
                The workspace runs on clearly-labelled demonstration data. No live
                scanning backend is connected in this build.
              </p>
            </div>

            <PreviewCard />
          </div>
        </section>

        {/* what it does */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight text-fg">
              What it does
            </h2>
            <ul className="space-y-6">
              <Capability
                icon={FileSearch}
                title="Turns scan output into reviewable findings"
                body="Each finding carries a severity, the target, the exact evidence, and a recommendation — so triage is reading, not guessing."
              />
              <Capability
                icon={ShieldCheck}
                title="Separates observation from interpretation"
                body="What was seen, what it means, and what to do are kept distinct, so a reviewer can trust the facts before weighing the risk."
              />
              <Capability
                icon={BookOpen}
                title="Explains the weakness in plain terms"
                body="The learning center describes each class of issue and how to close it, for reviewers who are still building depth."
              />
            </ul>
          </div>
        </section>

        {/* architecture */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            How it fits together
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            The scanning is done by command-line engines you run against systems
            you control. Their output is what a workspace like this reviews. This
            build ships the review layer with sample data; wiring a live engine is
            the next step.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <FlowStep
              step="1"
              icon={Terminal}
              title="Engines (CLI)"
              body="ghostmap maps a site's surface; shellhound hunts webshells on disk or over a URL. Both are read-only recon."
            />
            <FlowStep
              step="2"
              icon={FileSearch}
              title="Findings"
              body="Engine output becomes structured findings with evidence and severity."
            />
            <FlowStep
              step="3"
              icon={ShieldCheck}
              title="Workspace"
              body="You review, triage, and document remediation here."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a href={GHOSTMAP} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              <Github className="size-4" aria-hidden /> ghostmap
            </a>
            <a href={SHELLHOUND} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              <Github className="size-4" aria-hidden /> shellhound
            </a>
          </div>
        </section>

        {/* scope */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-fg">
                    Built around authorized scope
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
                    Security testing is only legitimate against systems you own or
                    have written permission to assess. The engines are read-only
                    and the workspace records the scope you are working within. It
                    is a tool for people with authorization — it does not grant
                    any.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Bird className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-fg">NIGHTJAR</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Site">
          <a
            href={SHELLHOUND}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-md px-3 py-2 text-sm text-fg-muted hover:text-fg sm:inline-flex"
          >
            Docs
          </a>
          <Link href="/dashboard" className={buttonClass("primary", "sm")}>
            Open workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PreviewCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-medium text-fg-muted">Needs attention</span>
        <DemoTag />
      </div>
      <ul className="space-y-2">
        {[
          { t: "Exposed .env file readable over HTTP", s: "critical", st: "open", host: "app.example.test" },
          { t: "Session cookie missing HttpOnly / Secure", s: "high", st: "reviewing", host: "app.example.test" },
          { t: "Content-Security-Policy header absent", s: "medium", st: "open", host: "www.example.test" },
        ].map((r) => (
          <li
            key={r.t}
            className="rounded-lg border border-border bg-surface-2 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <SeverityBadge severity={r.s as never} />
              <StatusBadge status={r.st as never} />
            </div>
            <p className="mt-2 text-sm font-medium text-fg">{r.t}</p>
            <p className="tnum mt-0.5 text-xs text-fg-subtle">{r.host}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileSearch;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div>
        <h3 className="font-medium text-fg">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
    </li>
  );
}

function FlowStep({
  step,
  icon: Icon,
  title,
  body,
}: {
  step: string;
  icon: typeof FileSearch;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="tnum flex size-6 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-fg-muted">
          {step}
        </span>
        <Icon className="size-4 text-accent" aria-hidden />
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <p>NIGHTJAR · a security review workspace</p>
        <div className="flex items-center gap-4">
          <a href={GHOSTMAP} target="_blank" rel="noreferrer" className="hover:text-fg">
            ghostmap
          </a>
          <a href={SHELLHOUND} target="_blank" rel="noreferrer" className="hover:text-fg">
            shellhound
          </a>
          <Link href="/dashboard" className="hover:text-fg">
            Workspace
          </Link>
        </div>
      </div>
    </footer>
  );
}
