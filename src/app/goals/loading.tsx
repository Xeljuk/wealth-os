import PageShell from "@/components/layout/PageShell";
import { GoalsSkeleton } from "./page";

export default function Loading() {
  return (
    <PageShell
      eyebrow="Goal Program"
      title="Your missions, in motion."
      subtitle="Your priorities, your numbers, and what they say about the path forward under the current operating stance."
    >
      <GoalsSkeleton />
    </PageShell>
  );
}
