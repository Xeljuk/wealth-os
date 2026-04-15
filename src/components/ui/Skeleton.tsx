"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Skeleton primitive — a single block placeholder with a single-direction
 * (left → right) shimmer sweep. All skeletons in the app share the same
 * animation definition, so sweeps move in sync direction across the page.
 */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width,
  height = 14,
  rounded = "rounded-md",
  className = "",
  style,
}: SkeletonProps) {
  const mergedStyle: React.CSSProperties = {
    width: width === undefined ? undefined : typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };
  return (
    <span
      aria-hidden="true"
      className={`skeleton-base relative block overflow-hidden ${rounded} ${className}`}
      style={mergedStyle}
    >
      <span className="skeleton-sweep absolute inset-0" />
    </span>
  );
}

/**
 * Returns whether a skeleton should currently be shown for a given loading
 * signal. Protects against two kinds of flicker:
 *
 *  1. Fast loads (< threshold ms) never show the skeleton at all — "flash
 *     of skeleton" is worse than "flash of content."
 *  2. Once shown, the skeleton stays visible for at least `minDuration`
 *     milliseconds so the eye has time to parse it.
 *
 * Defaults: threshold 200ms, minDuration 300ms.
 *
 * Dev/QA escape hatch: append `?skeleton=1` to any URL to force-render the
 * skeleton regardless of the actual loading state. Useful for manual
 * inspection on localhost where snapshot fetches finish in <100ms and the
 * 200ms threshold never triggers.
 */
export function useDelayedLoading(
  isLoading: boolean,
  opts: { threshold?: number; minDuration?: number } = {},
): boolean {
  const { threshold = 200, minDuration = 300 } = opts;
  const [show, setShow] = useState(false);
  const shownAtRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      if (show) return;
      const t = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShow(true);
      }, threshold);
      return () => clearTimeout(t);
    }
    if (!show) return;
    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, minDuration - elapsed);
    if (remaining === 0) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(false), remaining);
    return () => clearTimeout(t);
  }, [isLoading, show, threshold, minDuration]);

  const forced = useForceSkeletonFlag();
  return show || forced;
}

function useForceSkeletonFlag(): boolean {
  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () =>
      setForced(new URLSearchParams(window.location.search).get("skeleton") === "1");
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);
  return forced;
}
