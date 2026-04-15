import PageShell from "@/components/layout/PageShell";
import { ScenariosSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Decision Lab"
      title="Preview every path before you commit."
      subtitle="Each stance shifts your monthly room between goals, debt, and reserves. Each what-if runs the trade-off against your real numbers — so you see what changes, not just what you hope."
    >
      <ScenariosSkeleton />
    </PageShell>
  );
}
