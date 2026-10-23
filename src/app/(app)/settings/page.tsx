import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "@/components/settings-client";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace preferences and assessment scope. In this build these are stored in your browser only — there is no account or server behind them."
      />
      <SettingsClient />
    </>
  );
}
