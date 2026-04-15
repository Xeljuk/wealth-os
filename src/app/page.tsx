"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWealth } from "@/lib/wealth-context";

export default function Home() {
  const router = useRouter();
  const { isLoading, alphaStatus } = useWealth();

  useEffect(() => {
    if (isLoading) return;
    if (!alphaStatus.hasCustomData && alphaStatus.isDemoMode) {
      router.replace("/alpha-setup");
      return;
    }
    router.replace("/wealth-overview");
  }, [isLoading, alphaStatus, router]);

  return null;
}
