"use client";

import { Search } from "lucide-react";
import Link from "next/link";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between px-10 pb-2 pt-6">
      {/* Search — deferred for V1 */}
      <div className="relative w-72 opacity-75">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          type="text"
          readOnly
          tabIndex={-1}
          placeholder="Search — coming soon"
          className="pointer-events-none w-full cursor-default rounded-xl py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:opacity-60"
          style={{
            backgroundColor: "var(--color-surface-low)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-5">
        <nav className="flex items-center gap-5">
          <Link
            href="/assets"
            className="label-meta transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Assets
          </Link>
          <Link
            href="/copilot"
            className="label-meta transition-colors hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Copilot
          </Link>
        </nav>

        <div
          title="Emre"
          className="signature-gradient flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
        >
          E
        </div>
      </div>
    </div>
  );
}
