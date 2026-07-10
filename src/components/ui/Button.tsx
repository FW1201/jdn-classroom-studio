"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "surface" | "pill" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,border-color,box-shadow] duration-200 select-none disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  // Lovable 標誌性深色按鈕（inset shadow）
  primary:
    "bg-text text-on-dark rounded-sm [box-shadow:var(--shadow-inset)] hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-raised)]",
  ghost:
    "bg-transparent text-text rounded-sm border border-border-strong hover:bg-hover",
  surface: "bg-surface text-text rounded-sm border border-border hover:bg-hover",
  pill: "bg-surface-raised text-text rounded-full border border-border [box-shadow:var(--shadow-inset)] hover:bg-hover",
  danger:
    "bg-danger text-white rounded-sm [box-shadow:var(--shadow-inset)] hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-11 px-3 text-sm",
  md: "h-11 px-4 text-base", // ≥44px 觸控目標
  lg: "h-12 px-6 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "surface", size = "md", className = "", ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...rest}
      />
    );
  }
);

/** 圓形圖示按鈕（工具列用，44×44 觸控目標） */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>(function IconButton({ label, active, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-full border transition-[transform,background-color,border-color,opacity] duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-border-strong bg-text text-on-dark [box-shadow:var(--shadow-inset)]"
          : "border-border bg-surface-raised text-text hover:bg-hover"
      } ${className}`}
      {...rest}
    />
  );
});
