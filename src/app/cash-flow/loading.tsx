import PageShell from "@/components/layout/PageShell";
import { CashFlowSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Cash Flow"
      title="How your month operates."
      subtitle="Every lira you bring in, every commitment on its way out, and what remains to direct toward the things that matter."
    >
      <CashFlowSkeleton />
    </PageShell>
  );
}
