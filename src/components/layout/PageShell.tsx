import type { ReactNode } from "react";
import TopBar from "./TopBar";

interface PageShellProps {
  /** Optional eyebrow label above the page title (uppercase meta). */
  eyebrow?: string;
  /** Optional page title — omit when the page renders its own hero. */
  title?: string;
  /** Optional subtitle / lead paragraph. */
  subtitle?: string;
  /** Right-aligned period indicator (e.g. "March 2025"). */
  period?: string;
  /** Optional right-aligned action slot — typically a primary CTA button. */
  headerAction?: ReactNode;
  children: ReactNode;
}

export default function PageShell({
  eyebrow,
  title,
  subtitle,
  period,
  headerAction,
  children,
}: PageShellProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      {hasHeader && (
        <header className="flex items-start justify-between gap-6 px-12 pb-16 pt-8 lg:px-16 lg:pt-10">
          <div className="max-w-2xl">
            {eyebrow && (
              <p
                className="label-meta"
                style={{ color: "var(--color-accent)" }}
              >
                {eyebrow}
              </p>
            )}
            {title && (
              <h1
                className="display-page mt-3"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="lead-text mt-4">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-6 pt-2">
            {period && (
              <span
                className="label-meta"
                style={{ color: "var(--color-text-muted)" }}
              >
                {period}
              </span>
            )}
            {headerAction}
          </div>
        </header>
      )}

      <main className="flex-1 px-12 pb-24 lg:px-16">{children}</main>
    </div>
  );
}
