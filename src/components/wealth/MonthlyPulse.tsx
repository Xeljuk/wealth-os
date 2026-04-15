import type { MonthlyCashFlow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface FlowRow {
  label: string;
  amount: number;
  color: string;
  strong?: boolean;
}

interface Props {
  cashFlow: MonthlyCashFlow;
}

export default function MonthlyPulse({ cashFlow: cf }: Props) {
  const maxAmount = cf.totalInflow || 1;
  const totalOutflow = cf.totalFixed + cf.totalVariable + cf.totalDebtService;

  const inflowRows: FlowRow[] = cf.incomes.map((inc) => ({
    label: inc.name,
    amount: inc.amount,
    color: "var(--color-accent)",
  }));

  const outflowRows: FlowRow[] = [
    {
      label: "Fixed obligations",
      amount: cf.totalFixed,
      color: "var(--color-text-muted)",
    },
    {
      label: "Variable spending",
      amount: cf.totalVariable,
      color: "var(--color-text-muted)",
    },
    {
      label: "Debt service",
      amount: cf.totalDebtService,
      color: "var(--color-warning)",
    },
  ];

  return (
    <section className="h-full">
      <header>
        <p className="label-meta">Cash Flow</p>
        <h2 className="headline-section mt-2">How your month operates.</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Income in, obligations out, what&apos;s left to direct.
        </p>
      </header>

      <div className="mt-8 flex flex-col">
        {/* Inflow block */}
        <RowGroup rows={inflowRows} max={maxAmount} />
        <SummaryLine
          label="Total inflow"
          amount={cf.totalInflow}
          color="var(--color-text-primary)"
        />

        <Divider />

        {/* Outflow block */}
        <RowGroup rows={outflowRows} max={maxAmount} negative />
        <SummaryLine
          label="Total outflow"
          amount={totalOutflow}
          color="var(--color-text-secondary)"
          negative
        />

        <Divider />

        {/* Result block — allocatable is the hero of this section */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Allocatable each month
          </span>
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{
              color: "var(--color-accent)",
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(cf.allocatableSurplus)}
          </span>
        </div>
        <p
          className="mt-1 text-[12px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          After {formatCurrency(cf.safetyBuffer)} safety buffer
        </p>
      </div>
    </section>
  );
}

function RowGroup({
  rows,
  max,
  negative,
}: {
  rows: FlowRow[];
  max: number;
  negative?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 py-2">
      {rows.map((row) => {
        const pct = Math.max((row.amount / max) * 100, 2);
        return (
          <div key={row.label} className="flex items-center gap-4">
            <span
              className="w-[140px] shrink-0 text-[13px]"
              style={{
                color: row.strong
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                fontWeight: row.strong ? 600 : 400,
              }}
            >
              {row.label}
            </span>
            <div className="flex-1">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: row.color,
                  opacity: 0.7,
                }}
              />
            </div>
            <span
              className="w-[96px] shrink-0 text-right text-[13px] tabular-nums"
              style={{
                color: row.strong
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                fontWeight: row.strong ? 600 : 400,
              }}
            >
              {negative ? "−" : ""}
              {formatCurrency(row.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryLine({
  label,
  amount,
  color,
  negative,
}: {
  label: string;
  amount: number;
  color: string;
  negative?: boolean;
}) {
  return (
    <div className="mt-1 flex items-center justify-between">
      <span className="text-[13px] font-semibold" style={{ color }}>
        {label}
      </span>
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={{ color }}
      >
        {negative ? "−" : ""}
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="my-4 h-px"
      style={{ backgroundColor: "var(--color-border-light)" }}
    />
  );
}
