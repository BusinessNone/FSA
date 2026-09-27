import type { ButtonHTMLAttributes, ReactNode } from "react";
import { client, config } from "../content";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-accent text-accent-ink hover:opacity-90",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    ghost: "text-muted hover:text-ink hover:bg-surface-2",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FictionalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted", className)}
      title={client.figuresNote}
    >
      <span className="font-semibold text-ink">{client.name}</span>
      <span aria-hidden>·</span>
      <span className="font-medium uppercase tracking-wide">{client.fictionalBadge}</span>
    </span>
  );
}

export function IllustrativeTag() {
  return <Tag>{config.illustrativeLabel}</Tag>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</div>;
}

// Minimal inline icons (no icon font, no runtime fetches).
const paths = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7",
  copy: "M9 9h10v10H9zM5 15V5h10",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 100-10 5 5 0 000 10z",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  question: "M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17h.01",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  reset: "M4 12a8 8 0 108-8H8M8 4 5 7l3 3",
  pin: "M12 21s-6-5.5-6-11a6 6 0 1112 0c0 5.5-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z",
} as const;

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
