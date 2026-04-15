import PageShell from "@/components/layout/PageShell";
import { MonthCloseSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Monthly ritual"
      title="Close the month."
      subtitle="Lock in the numbers as they stand today. Future months compare against this snapshot — so you can see what actually moved."
    >
      <MonthCloseSkeleton />
    </PageShell>
  );
}
