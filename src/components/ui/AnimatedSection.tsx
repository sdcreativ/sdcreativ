"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useRevealOnView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

export function AnimatedSection({
  children,
  className,
  id,
  delay = 0,
}: AnimatedSectionProps) {
  const { ref, visible } = useRevealOnView<HTMLElement>();

  return (
    <section
      ref={ref}
      id={id}
      className={cn("reveal-section", visible && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </section>
  );
}

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  const { ref, visible } = useRevealOnView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("reveal-card", visible && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
