"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const isPortalRoute =
      pathname === "/login" ||
      pathname.startsWith("/institution") ||
      pathname.startsWith("/program") ||
      pathname.startsWith("/stakeholder");

    if (isPortalRoute || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let lenisInstance: { raf: (time: number) => void; destroy: () => void } | null = null;

    const setupLenis = async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) {
        return;
      }

      lenisInstance = new Lenis({
        duration: 1.1,
        lerp: 0.08,
        smoothWheel: true,
      });

      const tick = (time: number) => {
        lenisInstance?.raf(time);
        frameId = window.requestAnimationFrame(tick);
      };

      frameId = window.requestAnimationFrame(tick);
    };

    void setupLenis();

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      lenisInstance?.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
}
