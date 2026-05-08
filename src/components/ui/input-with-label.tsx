"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type InputWithLabelProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hideLabel?: boolean;
  helpText?: string;
  error?: string;
  leftIcon?: ReactNode;
  wrapperClassName?: string;
  inputClassName?: string;
};

export function InputWithLabel({
  label,
  hideLabel = false,
  helpText,
  error,
  leftIcon,
  wrapperClassName,
  inputClassName,
  id,
  ...props
}: InputWithLabelProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("min-w-0 space-y-1.5", wrapperClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          "block text-sm font-medium text-foreground",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full rounded-2xl border border-border/70 bg-muted/35 px-4 text-sm text-foreground shadow-sm outline-none transition",
            "placeholder:text-muted-foreground/70",
            "hover:border-border",
            "focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon && "pl-11",
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/15",
            inputClassName,
          )}
          {...props}
        />
      </div>

      {helpText && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{helpText}</p>
      )}

      {error && <p className="text-xs leading-5 text-destructive">{error}</p>}
    </div>
  );
}