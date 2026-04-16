import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type Tone = "lowest" | "low" | "high";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  children: ReactNode;
};

const tones: Record<Tone, string> = {
  lowest: "bg-surface-container-lowest",
  low: "bg-surface-container-low",
  high: "bg-surface-container-high",
};

export function Card({
  tone = "lowest",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn("rounded-lg shadow-sm p-6", tones[tone], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
