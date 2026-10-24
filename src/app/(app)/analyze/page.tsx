import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AnalyzeClient } from "@/components/analyze-client";

export const metadata: Metadata = { title: "Analyze a URL" };

export default function AnalyzePage() {
  return (
    <>
      <PageHeader
        eyebrow="Offline analysis"
        title="Analyze a URL"
        description="Inspect a link or domain for phishing and lookalike indicators — userinfo tricks, punycode homoglyphs, brand terms away from the real domain, risky TLDs. Offline and passive: nothing is fetched."
      />
      <AnalyzeClient />
    </>
  );
}
