"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Lazy-load lottie-react on the client only — avoids the SSR path
// entirely so we never ship Lottie's Canvas/SVG code to the server.
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  /**
   * Public path to a Lottie JSON file (e.g. "/lottie/ripple.json").
   * If the file doesn't exist or fails to load, the component
   * gracefully falls back to rendering just the emoji.
   */
  animationPath?: string;
  /** Required emoji fallback + hero character displayed in the centre. */
  emoji: string;
  /** Size of the outer container (square). */
  size?: number;
  /** Accent colour used for the emoji drop-shadow tint. */
  accent: string;
  /** If true, the Lottie layer tints toward the accent colour via CSS filter. */
  tintLottie?: boolean;
}

type LottieJson = Record<string, unknown>;

export default function JourneyAnimation({
  animationPath,
  emoji,
  size = 140,
  accent,
  tintLottie = true,
}: Props) {
  const [animationData, setAnimationData] = useState<LottieJson | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!animationPath) {
      setAnimationData(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    setAnimationData(null);

    fetch(animationPath, { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`Lottie fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data: LottieJson) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [animationPath]);

  const hasLottie = animationData && !failed;
  const emojiFontSize = Math.round(size * 0.48);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Lottie layer sits behind the emoji. It can be tinted with the
          accent colour using a CSS hue-rotate/filter approach, but for
          a single-colour vector the cleanest trick is the currentColor
          drop-shadow on the container. We keep it simple: render Lottie
          as-is and let the emoji own the foreground. */}
      {hasLottie && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            filter: tintLottie
              ? `drop-shadow(0 0 6px ${accent}66)`
              : undefined,
          }}
        >
          <Lottie
            animationData={animationData}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
            rendererSettings={{
              preserveAspectRatio: "xMidYMid meet",
            }}
          />
        </div>
      )}

      {/* Emoji always renders on top (or alone if Lottie not loaded) */}
      <span
        aria-hidden="true"
        className="relative"
        style={{
          fontSize: `${emojiFontSize}px`,
          lineHeight: 1,
          filter: `drop-shadow(0 6px 14px ${accent}55)`,
          zIndex: 1,
        }}
      >
        {emoji}
      </span>
    </div>
  );
}
