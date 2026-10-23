"use client";

import * as React from "react";
import { Save, Check, ShieldCheck } from "lucide-react";
import { Card, Button } from "@/components/ui";

const KEY = "nightjar.settings.v1";

interface Settings {
  scope: string;
  maskSecrets: boolean;
  perPage: number;
}

const DEFAULTS: Settings = { scope: "", maskSecrets: true, perPage: 25 };

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsClient() {
  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);
  const [saved, setSaved] = React.useState<Settings>(DEFAULTS);
  const [status, setStatus] = React.useState<"idle" | "saved">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage after mount. Reading the store during render
  // (lazy initial state) would diverge from the server-rendered HTML and cause
  // a hydration mismatch, so syncing here in an effect is the correct place.
  React.useEffect(() => {
    const s = load();
    /* eslint-disable react-hooks/set-state-in-effect */
    setSettings(s);
    setSaved(s);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  function validate(s: Settings): string | null {
    const bad = s.scope
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !HOST_RE.test(l));
    if (bad.length) return `Not a valid host: ${bad[0]}`;
    return null;
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(settings);
    if (err) {
      setError(err);
      setStatus("idle");
      return;
    }
    setError(null);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
      setSaved(settings);
      setStatus("saved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setError("Could not save to this browser's storage.");
    }
  }

  return (
    <form onSubmit={onSave} className="max-w-2xl space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-fg">Assessment scope</h2>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Hosts you are authorized to test, one per line. This is a reminder of
          scope — it does not grant permission, and nothing here starts a scan.
        </p>
        <label htmlFor="scope" className="mt-4 block text-xs font-medium text-fg">
          Allowed hosts
        </label>
        <textarea
          id="scope"
          value={settings.scope}
          onChange={(e) => setSettings({ ...settings, scope: e.target.value })}
          rows={4}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={"app.example.test\nwww.example.test"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "scope-error" : undefined}
          className="tnum mt-1.5 w-full rounded-md border border-border bg-surface-2 p-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        />
        {error ? (
          <p id="scope-error" className="mt-1.5 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      <Card className="divide-y divide-border">
        <ToggleRow
          id="mask"
          label="Mask secrets in evidence"
          hint="Replace password- and token-like values with a placeholder when showing evidence."
          checked={settings.maskSecrets}
          onChange={(v) => setSettings({ ...settings, maskSecrets: v })}
        />
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <label htmlFor="perPage" className="text-sm font-medium text-fg">
              Findings per page
            </label>
            <p className="mt-0.5 text-xs text-fg-muted">
              How many rows the findings table shows before paging.
            </p>
          </div>
          <select
            id="perPage"
            value={settings.perPage}
            onChange={(e) =>
              setSettings({ ...settings, perPage: Number(e.target.value) })
            }
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={!dirty}>
          <Save className="size-4" aria-hidden />
          Save preferences
        </Button>
        <span className="text-sm text-success" role="status" aria-live="polite">
          {status === "saved" ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" aria-hidden />
              Saved to this browser
            </span>
          ) : null}
        </span>
      </div>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        <p className="mt-0.5 max-w-sm text-xs text-fg-muted">{hint}</p>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors duration-[var(--dur)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] aria-checked:border-accent aria-checked:bg-accent"
        style={checked ? { backgroundColor: "var(--accent)" } : { backgroundColor: "var(--surface-3)" }}
      >
        <span
          className="inline-block size-4 translate-x-1 rounded-full bg-white transition-transform duration-[var(--dur)]"
          style={{ transform: checked ? "translateX(22px)" : "translateX(4px)" }}
        />
      </button>
    </div>
  );
}
