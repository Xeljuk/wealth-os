import type { GoalStatus } from "@/lib/types";

const CONFIG: Record<
  GoalStatus,
  { label: string; bg: string; text: string }
> = {
  on_track: {
    label: "On Track",
    bg: "var(--color-positive-light)",
    text: "var(--color-positive)",
  },
  tight: {
    label: "Tight",
    bg: "var(--color-warning-light)",
    text: "var(--color-warning)",
  },
  at_risk: {
    label: "At Risk",
    bg: "var(--color-negative-light)",
    text: "var(--color-negative)",
  },
};

export default function StatusBadge({ status }: { status: GoalStatus }) {
  const { label, bg, text } = CONFIG[status];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
