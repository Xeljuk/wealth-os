import type { GoalTrajectory } from "@/lib/wealth-context";
import { formatCurrency } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";

const STATUS_BAR_COLORS: Record<string, string> = {
  on_track: "var(--color-positive)",
  tight: "var(--color-warning)",
  at_risk: "var(--color-negative)",
};

interface Props {
  goalTrajectories: GoalTrajectory[];
  allocatableSurplus: number;
}

export default function GoalTension({
  goalTrajectories,
  allocatableSurplus,
}: Props) {
  return (
    <section className="h-full">
      <header>
        <p className="label-meta">Goal Programs</p>
        <h2 className="headline-section mt-2">Where your plan strains.</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Every goal pulls from the same {formatCurrency(allocatableSurplus)}/mo —
          here&apos;s how the pace is holding.
        </p>
      </header>

      <div className="mt-8 flex flex-col">
        {goalTrajectories.map((g, idx) => {
          const progress = g.currentAmount / g.targetAmount;
          const pacePercent = Math.round(g.paceRatio * 100);
          const isLast = idx === goalTrajectories.length - 1;

          return (
            <div
              key={g.id}
              className="flex flex-col gap-3 py-5"
              style={{
                borderBottom: !isLast
                  ? "1px solid var(--color-border-light)"
                  : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {g.name}
                </span>
                <StatusBadge status={g.status} />
              </div>

              <div>
                <div
                  className="h-1 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--color-border-light)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(progress * 100, 100)}%`,
                      backgroundColor: STATUS_BAR_COLORS[g.status],
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] tabular-nums">
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {formatCurrency(g.currentAmount)}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    of {formatCurrency(g.targetAmount)}
                  </span>
                </div>
              </div>

              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Needs{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatCurrency(g.monthlyRequired)}/mo
                </span>
                {g.allocation > 0 ? (
                  <>
                    , gets{" "}
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          g.paceRatio >= 0.5
                            ? "var(--color-positive)"
                            : "var(--color-warning)",
                      }}
                    >
                      {formatCurrency(g.allocation)}/mo
                    </span>{" "}
                    <span style={{ color: "var(--color-text-muted)" }}>
                      — {pacePercent}% of required pace
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--color-text-muted)" }}>
                    , receives no allocation under the current stance
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
