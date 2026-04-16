import { cn } from "@/shared/utils/cn";

type IconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function Icon({ name, className, filled = false }: IconProps) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
