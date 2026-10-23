import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ScanClient } from "@/components/scan-client";

export const metadata: Metadata = { title: "Scan a URL" };

export default function ScanPage() {
  return (
    <>
      <PageHeader
        title="Scan a URL"
        description="A live, passive audit. Enter a site you are authorized to test and NIGHTJAR reads what the server reveals — headers, cookies, exposed files, technology, and surface — using GET requests only."
      />
      <ScanClient />
    </>
  );
}
