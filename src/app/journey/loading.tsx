import PageShell from "@/components/layout/PageShell";
import { JourneySkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Journey"
      title="Your five-year walk."
      subtitle="The path ahead, laid out one step at a time. Every node is a moment your plan carries you toward — a debt clearing, a goal reached, a checkpoint along the way."
    >
      <JourneySkeleton />
    </PageShell>
  );
}
