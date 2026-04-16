import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";
import { Icon } from "./icon";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: string;
};

export function Input({ icon, className, ...rest }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <Icon
          name={icon}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
        />
      )}
      <input
        className={cn(
          "w-full py-3 pr-4 bg-surface-container-low soft-border rounded text-sm font-medium",
          "focus:ring-2 focus:ring-primary-container focus:outline-none transition-all",
          "placeholder:text-outline-variant",
          icon ? "pl-10" : "pl-4",
          className,
        )}
        {...rest}
      />
    </div>
  );
}

type FieldLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

export function FieldLabel({ htmlFor, children, className }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-[10px] font-bold text-outline uppercase tracking-wider ml-1 block",
        className,
      )}
    >
      {children}
    </label>
  );
}
