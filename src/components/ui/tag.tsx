import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type TagVariant = "accent" | "secondary" | "neutral";

type TagProps = {
  variant?: TagVariant;
  children: ReactNode;
  className?: string;
};

const variants: Record<TagVariant, string> = {
  accent: "bg-tertiary-fixed text-on-tertiary-fixed",
  secondary: "bg-secondary-container text-on-secondary-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export function Tag({ variant = "accent", children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

type EyebrowProps = {
  children: ReactNode;
  className?: string;
};

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold text-secondary uppercase tracking-[0.2em] block",
        className,
      )}
    >
      {children}
    </span>
  );
}
