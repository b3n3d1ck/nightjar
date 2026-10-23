import Link from "next/link";
import {
  ArrowRight,
  Terminal,
  FileSearch,
  ShieldCheck,
  Radar,
  Lock,
  Cookie,
  CornerDownRight,
  BookOpen,
  Github,
  Check,
  Minus,
  Globe,
  Bird,
} from "lucide-react";
import { buttonClass, SeverityBadge } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";

const GHOSTMAP = "https://github.com/b3n3d1ck/ghostmap";
const SHELLHOUND = "https://github.com/b3n3d1ck/shellhound";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <Capabilities />
        <Workflow />
        <Trust />
        <ClosingBand />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ hero -- */

function Hero() {
  return (
    <section className="aura relative">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            passive · authorized · read-only
          </p>
          <h1 className="mt-5 max-w-xl text-pretty font-display text-4xl font-semibold leading-[1.05] text-fg sm:text-5xl lg:text-[3.4rem]">
            Turn scanner output into findings you can act on.
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-fg-muted">
            NIGHTJAR is the review layer that sits on top of your scans. It keeps
            the raw observation, the reason it matters, and the fix as three
            separate things, so triage becomes reading instead of guessing — and
            every assessment stays inside a scope you are authorized to test.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/scan" className={buttonClass("primary", "md")}>
              Run a passive scan
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/dashboard" className={buttonClass("secondary", "md")}>
              Open the workspace
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-accent" aria-hidden />
              Live passive audit for sites you control
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-accent" aria-hidden />
              Dashboards use labelled demo data
            </span>
          </p>
        </div>

        <PreviewPanel />
      </div>
    </section>
  );
}

function PreviewPanel() {
  const rows = [
    { t: "Exposed .env readable over HTTP", s: "critical", c: "confirmed", loc: "/.env" },
    { t: "Session cookie missing HttpOnly and Secure", s: "high", c: "confirmed", loc: "set-cookie: sid" },
    { t: "Content-Security-Policy header absent", s: "medium", c: "potential", loc: "response headers" },
    { t: "Server version disclosed in banner", s: "low", c: "informational", loc: "server: nginx/1.21.0" },
  ];
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 hairline-grid"
        aria-hidden
      />
      <div className="nj-card overflow-hidden shadow-[var(--shadow-lg)]">
        {/* target bar */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
          <Globe className="size-3.5 text-fg-subtle" aria-hidden />
          <span className="tnum text-xs text-fg-muted">app.example.test</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Lock className="size-3" aria-hidden /> https
          </span>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            preview
          </span>
        </div>

        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.t} className="flex items-start gap-3 px-4 py-3">
              <SeverityBadge severity={r.s as never} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-fg">{r.t}</p>
                <p className="tnum mt-0.5 truncate text-xs text-fg-subtle">
                  {r.loc} · {r.c}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-border bg-surface-2 px-4 py-2.5 text-[11px] text-fg-subtle">
          Static composition for illustration — not the result of a live scan.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- capabilities -- */

function Capabilities() {
  return (
    <section
      id="capabilities"
      className="scroll-mt-16 border-t border-border bg-surface/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Capabilities</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Everything here runs real code — or says plainly that it doesn&apos;t.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Two surfaces execute against a real target or a real URL. The rest of
            the workspace is review tooling on top of them. Nothing on this page
            is a feature that hasn&apos;t shipped.
          </p>
        </div>

        {/* lead feature + supporting column */}
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <FeatureLead />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <SupportCard
              icon={Radar}
              title="Offline URL analysis"
              body="Paste a link and NIGHTJAR inspects it with no network at all — userinfo tricks, punycode homoglyphs, raw-IP hosts, brand terms used away from the real domain. Indicators, not verdicts."
            />
            <SupportCard
              icon={FileSearch}
              title="Findings you can triage"
              body="A searchable, filterable table with a detail panel: severity, confidence, the exact evidence, and a recommendation. Status you set is kept per browser."
            />
          </div>
        </div>

        {/* smaller row of supporting pieces */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <MiniCard icon={Lock} title="TLS and header checks" body="Missing CSP, HSTS, frame and content-type protections, flagged with the standard they map to." />
          <MiniCard icon={Cookie} title="Per-cookie analysis" body="Each Set-Cookie is read on its own, so one secure cookie can't mask another's missing flags." />
          <MiniCard icon={BookOpen} title="Plain-language learning" body="Every weakness class explained in the Learn section, for reviewers still building depth." />
        </div>
      </div>
    </section>
  );
}

function FeatureLead() {
  const checks = [
    "Host, reverse DNS, server and tech fingerprint",
    "Missing security headers and version disclosure",
    "Exposed sensitive files, with secrets masked",
    "SSRF guard, per-hop redirect re-validation, scope window",
  ];
  return (
    <div className="nj-card relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
      <div>
        <span className="inline-flex size-10 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-accent-soft text-accent">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h3 className="mt-5 font-display text-xl font-semibold text-fg">
          Live passive scan
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
          Enter a URL you&apos;re authorized to test and the server runs a
          GET-only audit — no brute force, no exploitation. Findings carry a
          stable ID, a confidence level, standards references, and a scanner
          version; the run notes anything it skipped.
        </p>
      </div>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c} className="flex items-start gap-2 text-sm text-fg-muted">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            {c}
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <Link href="/scan" className={buttonClass("secondary", "sm")}>
          Try it on a site you own
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function SupportCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Radar;
  title: string;
  body: string;
}) {
  return (
    <div className="nj-card p-5">
      <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <h3 className="mt-4 font-medium text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function MiniCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-fg-subtle" aria-hidden />
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------- workflow -- */

function Workflow() {
  const steps = [
    { n: "01", icon: ShieldCheck, title: "Define authorized scope", body: "Name the target, the hosts a redirect may reach, and the window you're permitted to test in. The backend enforces it." },
    { n: "02", icon: Terminal, title: "Run the passive audit", body: "NIGHTJAR fetches with GET only, decoding obfuscated hosts and re-checking every redirect against the SSRF guard." },
    { n: "03", icon: FileSearch, title: "Review findings and evidence", body: "Read each observation with its masked evidence and confidence, separate from what it means." },
    { n: "04", icon: CornerDownRight, title: "Prioritize remediation", body: "Sort by severity, set a status, and export the result as Markdown or JSON." },
  ];
  return (
    <section id="workflow" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-xl font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Four steps from an authorized target to a remediation list.
        </h2>

        <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            className="absolute left-0 right-0 top-5 hidden h-px bg-border lg:block"
            aria-hidden
          />
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.n} className="relative">
                <div className="flex items-center gap-3 lg:block">
                  <span className="relative flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-accent">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="eyebrow mt-0 lg:mt-4 lg:block">{s.n}</span>
                </div>
                <h3 className="mt-3 font-medium text-fg lg:mt-2">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- trust -- */

function Trust() {
  const does = [
    "Run a live, passive, GET-only audit against a URL you control",
    "Enforce authorization and scope in backend code, not just the UI",
    "Analyze a link for phishing indicators with no network calls",
    "Keep evidence, interpretation and remediation as separate fields",
    "Mask secrets before they're shown or exported",
  ];
  const doesnt = [
    "Grant you any authorization to test a system",
    "Exploit, brute-force, or run active attacks",
    "Store shared multi-user data yet — status lives per browser",
    "Claim detection rates, customer counts, or certifications",
    "Mix demo data into live results — demo surfaces are labelled",
  ];
  return (
    <section id="trust" className="scroll-mt-16 border-t border-border bg-surface/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Honest by default</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            What NIGHTJAR does, and what it doesn&apos;t.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Security tools earn trust by being precise about their own limits.
            Here is the line, drawn plainly.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="nj-card p-6">
            <h3 className="flex items-center gap-2 font-medium text-fg">
              <Check className="size-4 text-accent" aria-hidden /> It does
            </h3>
            <ul className="mt-4 space-y-3">
              {does.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-6">
            <h3 className="flex items-center gap-2 font-medium text-fg">
              <Minus className="size-4 text-fg-subtle" aria-hidden /> It doesn&apos;t
            </h3>
            <ul className="mt-4 space-y-3">
              {doesnt.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-fg-muted">
                  <Minus className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-fg-subtle">Paired command-line engines:</span>
          <a href={GHOSTMAP} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
            <Github className="size-4" aria-hidden /> ghostmap
          </a>
          <a href={SHELLHOUND} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
            <Github className="size-4" aria-hidden /> shellhound
          </a>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- closing band -- */

function ClosingBand() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="nj-card aura relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-14">
          <h2 className="mx-auto max-w-xl font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Point it at something you own and read the result.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-fg-muted">
            No sign-up, no agent to install. The scan runs server-side and the
            findings land in the workspace.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/scan" className={buttonClass("primary", "md")}>
              Run a passive scan
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/dashboard" className={buttonClass("secondary", "md")}>
              Explore the workspace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer -- */

function SiteFooter() {
  const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Scan a URL", href: "/scan" },
        { label: "Analyze a URL", href: "/analyze" },
        { label: "Findings", href: "/findings" },
        { label: "Workspace", href: "/dashboard" },
      ],
    },
    {
      title: "Engines",
      links: [
        { label: "ghostmap", href: GHOSTMAP, external: true },
        { label: "shellhound", href: SHELLHOUND, external: true },
      ],
    },
    {
      title: "Project",
      links: [
        { label: "Learn", href: "/learn" },
        { label: "GitHub", href: "https://github.com/b3n3d1ck/nightjar", external: true },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-accent-soft text-accent">
              <Bird className="size-4" aria-hidden />
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.08em] text-fg">
              NIGHTJAR
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-subtle">
            A review layer for authorized web-security work. It does not grant
            authorization — run assessments only against systems you own or are
            permitted to test.
          </p>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <p className="eyebrow">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) =>
                l.external ? (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-fg-muted hover:text-fg">
                      {l.label}
                    </a>
                  </li>
                ) : (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-fg-muted hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>NIGHTJAR · security review workspace</p>
          <p>Passive, read-only, scope-bound by design.</p>
        </div>
      </div>
    </footer>
  );
}
