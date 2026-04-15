import PageShell from "@/components/layout/PageShell";
import { AssetsSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Balance Sheet"
      title="The architecture of what you own."
      subtitle="What you hold, what you owe, and the structure that shapes how resilient, liquid, and productive your wealth actually is."
    >
      <AssetsSkeleton />
    </PageShell>
  );
}
