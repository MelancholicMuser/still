"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import {
  Compass,
  Sparkles,
} from "lucide-react";
import { cx, clamp } from "@/lib/helpers";

export const RM = "motion-reduce:animate-none motion-reduce:transition-none";

export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    ghost: "text-stone-600 hover:bg-stone-100",
    danger: "border-2 border-rose-500 bg-white text-rose-600 hover:bg-rose-50",
    soft: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  };
  const sizes = {
    sm: "min-h-11 px-3 text-sm",
    md: "min-h-12 px-5 text-sm",
    lg: "min-h-14 px-6 text-base",
    icon: "size-11",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        FOCUS,
        RM,
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md",
        RM,
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "stone",
  className,
  children,
}: {
  tone?: "stone" | "emerald" | "amber" | "rose";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  label,
  className,
  barClassName,
}: {
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const v = clamp(value, 0, 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cx("h-2 w-full overflow-hidden rounded-full bg-stone-200", className)}
    >
      <div
        className={cx("h-full rounded-full bg-emerald-500 transition-all duration-500", RM, barClassName)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Avatar({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl", className)}
    >
      {emoji}
    </span>
  );
}

export function Ring({
  size,
  stroke,
  progress,
  className,
  label,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  className?: string;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(progress, 0, 1);
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="currentColor" className="text-stone-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cx("transition-[stroke-dashoffset,color] duration-1000 ease-linear", RM, className)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  dismissible?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end">
      <button
        type="button"
        aria-label="Close sheet"
        tabIndex={-1}
        onClick={dismissible ? onClose : undefined}
        className={cx("absolute inset-0 bg-black/40 animate-in fade-in duration-200", RM)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative max-h-[88%] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(2rem_+_env(safe-area-inset-bottom))] shadow-2xl outline-none animate-in slide-in-from-bottom duration-300 [&::-webkit-scrollbar]:hidden",
          RM,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200" />
        {children}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6">
      <div className={cx("absolute inset-0 bg-black/50 animate-in fade-in duration-200", RM)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={cx("relative w-full rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 fade-in duration-200", RM)}
      >
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  cta,
  onClick,
}: {
  title: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="flex size-28 items-center justify-center rounded-full bg-emerald-100">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-200">
            <Compass className="size-10 text-emerald-700" aria-hidden="true" />
          </div>
        </div>
        <Sparkles className={cx("absolute -right-1 top-1 size-6 text-amber-500 animate-pulse", RM)} aria-hidden="true" />
      </div>
      <p className="text-lg font-bold tracking-tight text-stone-900 text-balance">{title}</p>
      <Button size="lg" className="mt-6 w-full" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}

export function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "transition-all duration-500",
        RM,
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
