import PageShell from "@/components/layout/PageShell";
import { CopilotSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="AI Copilot"
      title="Your wealth strategist, on call."
      subtitle="Synthesises your current model — balance sheet, cash flow, goals, scenarios — into plain-language guidance. Ground every answer in your real numbers."
    >
      <CopilotSkeleton />
    </PageShell>
  );
}
