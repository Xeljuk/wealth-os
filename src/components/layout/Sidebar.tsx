"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Landmark,
  Target,
  GitBranch,
  Sparkles,
  Route,
  Plus,
  Settings,
  CheckCircle2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/month-close", label: "Month close", icon: CheckCircle2 },
  { href: "/journey", label: "Journey", icon: Route },
  { href: "/wealth-overview", label: "Overview", icon: LayoutDashboard },
  { href: "/cash-flow", label: "Cash Flow", icon: ArrowRightLeft },
  { href: "/assets", label: "Assets", icon: Landmark },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/scenarios", label: "Scenarios", icon: GitBranch },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col"
      style={{ backgroundColor: "var(--color-sidebar)" }}
    >
      {/* Brand */}
      <div className="px-6 pb-8 pt-8">
        <p
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "var(--color-accent)" }}
        >
          Ethos Wealth
        </p>
        <p
          className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--color-text-muted)" }}
        >
          The Curated Sanctuary
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium transition-all duration-200"
              style={{
                color: active
                  ? "var(--color-accent)"
                  : "var(--color-sidebar-text)",
                backgroundColor: active
                  ? "var(--color-sidebar-active-bg)"
                  : "transparent",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-sm"
                  style={{ backgroundColor: "var(--color-accent)" }}
                />
              )}
              <span className="shrink-0">
                <Icon
                  size={18}
                  strokeWidth={active ? 2 : 1.5}
                  style={{
                    color: active
                      ? "var(--color-accent)"
                      : "var(--color-sidebar-text)",
                  }}
                />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* New Entry CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/alpha-setup"
          className="signature-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New Entry
        </Link>
      </div>
    </aside>
  );
}
