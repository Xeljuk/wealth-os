import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionVariant?: "link" | "button";
}

export default function FeatureCard({
  icon,
  title,
  description,
  actionLabel,
  actionHref = "#",
  actionVariant = "link",
}: FeatureCardProps) {
  const content = (
    <div
      className="atmospheric-shadow group relative flex h-full flex-col gap-4 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--color-accent-light)",
            color: "var(--color-accent)",
          }}
        >
          {icon}
        </span>
        {actionVariant === "link" && actionLabel && (
          <span
            className="opacity-40 transition-opacity group-hover:opacity-100"
            style={{ color: "var(--color-accent)" }}
          >
            <ArrowUpRight size={18} />
          </span>
        )}
      </div>

      <div>
        <h3
          className="text-[18px] font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.015em" }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {description}
        </p>
      </div>

      {actionLabel && actionVariant === "button" && (
        <span
          className="signature-gradient mt-auto inline-flex w-fit items-center rounded-lg px-5 py-2 text-[13px] font-semibold text-white"
        >
          {actionLabel}
        </span>
      )}
    </div>
  );

  // Link variant: whole card is clickable. Button variant: inner button is the CTA.
  if (actionVariant === "link" && actionHref) {
    return (
      <Link href={actionHref} className="block h-full">
        {content}
      </Link>
    );
  }

  if (actionVariant === "button" && actionHref) {
    return <Link href={actionHref} className="block h-full">{content}</Link>;
  }

  return content;
}
