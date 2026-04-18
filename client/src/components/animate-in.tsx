import { useRef, useEffect, useState } from "react";

export function useInView(threshold = 0.12, rootMargin = "0px 0px -48px 0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}

export type AnimateDirection = "up" | "left" | "right" | "fade" | "scale";

export function AnimateIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: AnimateDirection;
}) {
  const { ref, inView } = useInView();
  const dirClass = {
    up: "animate-scroll-up",
    left: "animate-scroll-left",
    right: "animate-scroll-right",
    fade: "animate-scroll-fade",
    scale: "animate-scroll-scale",
  }[direction];

  return (
    <div
      ref={ref}
      className={`${dirClass} ${inView ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
