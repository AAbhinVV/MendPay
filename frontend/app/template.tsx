"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power3.out",
          clearProps: "all",
          onComplete: () => setReady(true),
        },
      );
    });
    media.add("(prefers-reduced-motion: reduce)", () => {
      setReady(true);
    });
    return () => media.revert();
  }, []);
  return (
    <div
      ref={ref}
      data-page-transition
      data-transition-state={ready ? "settled" : "entering"}
    >
      {children}
    </div>
  );
}
