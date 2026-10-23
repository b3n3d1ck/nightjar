import { Suspense } from "react";
import type { Metadata } from "next";
import { FindingsClient } from "@/components/findings-client";
import { Skeleton } from "@/components/ui";
import { DEMO_FINDINGS } from "@/lib/demo";

export const metadata: Metadata = { title: "Findings" };

export default function FindingsPage() {
  return (
    <Suspense fallback={<FindingsFallback />}>
      <FindingsClient findings={DEMO_FINDINGS} />
    </Suspense>
  );
}

function FindingsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
