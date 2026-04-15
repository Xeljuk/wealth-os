import PageShell from "@/components/layout/PageShell";
import { WealthOverviewSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Wealth Overview"
      title="Your wealth, at a glance."
      subtitle="A single view of everything you own, owe, and earn — and what the next five years could look like if you stay the course."
    >
      <WealthOverviewSkeleton />
    </PageShell>
  );
}
