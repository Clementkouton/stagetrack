"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Wrapper d'apparition au scroll : fondu + montée douce, joué une seule fois.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * En-tête de section standardisé : badge optionnel, titre, sous-titre.
 */
export function SectionHeading({
  badge,
  title,
  subtitle,
  align = "center",
  dark = false,
}: {
  badge?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left"
      )}
    >
      {badge ? <div>{badge}</div> : null}
      <h2
        className={cn(
          "max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]",
          dark ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "max-w-2xl text-pretty text-base leading-relaxed sm:text-lg",
            dark ? "text-white/70" : "text-body"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}

/**
 * Badge de section (pastille au-dessus des titres).
 */
export function SectionBadge({
  icon,
  children,
  variant = "teal",
}: {
  icon?: ReactNode;
  children: ReactNode;
  variant?: "teal" | "gold" | "white";
}) {
  const styles =
    variant === "gold"
      ? "border-gold/30 bg-gold/10 text-gold-dark"
      : variant === "white"
        ? "border-white/20 bg-white/10 text-white"
        : "border-brand/15 bg-brand/5 text-brand";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide sm:text-[13px]",
        styles
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Compteur animé qui se déclenche à l'entrée dans le viewport.
 */
export function CountUp({
  to,
  suffix = "",
  duration = 1600,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")}
      {suffix}
    </span>
  );
}
