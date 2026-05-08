"use client";

import type { CSSProperties } from "react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckSelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type CheckSelectProps<T extends string> = {
  label?: string;
  hideLabel?: boolean;
  value: T;
  options: CheckSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  className?: string;
  triggerClassName?: string;
};

type FloatingPosition = {
  top: number;
  left: number;
  width: number;
};

function getPortalContainer(trigger: HTMLElement | null): HTMLElement {
  const dialogContent = trigger?.closest("[data-slot='dialog-content']");

  if (dialogContent instanceof HTMLElement) {
    return dialogContent;
  }

  return document.body;
}

export function CheckSelect<T extends string>({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  helpText,
  error,
  className,
  triggerClassName,
}: CheckSelectProps<T>) {
  const id = useId();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [position, setPosition] = useState<FloatingPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const trigger = triggerRef.current;

    if (!trigger) return;

    const container = getPortalContainer(trigger);
    const triggerRect = trigger.getBoundingClientRect();

    setPortalContainer(container);

    if (container === document.body) {
      setPosition({
        top: triggerRect.bottom + 6,
        left: triggerRect.left,
        width: triggerRect.width,
      });

      return;
    }

    const containerRect = container.getBoundingClientRect();

    setPosition({
      top: triggerRect.bottom - containerRect.top + 6,
      left: triggerRect.left - containerRect.left,
      width: triggerRect.width,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuStyle: CSSProperties = {
    top: position.top,
    left: position.left,
    width: position.width,
  };

  const isInsideDialog =
    portalContainer !== null && portalContainer !== document.body;

  return (
    <div ref={rootRef} className={cn("min-w-0 space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "block text-sm font-medium text-foreground",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/35 px-4 text-left text-sm text-foreground shadow-sm outline-none transition",
          "hover:border-border",
          "focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus:border-destructive focus:ring-destructive/15",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {helpText && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{helpText}</p>
      )}

      {error && <p className="text-xs leading-5 text-destructive">{error}</p>}

      {mounted &&
        open &&
        portalContainer &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            role="listbox"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            className={cn(
              "z-[100] max-h-72 overflow-y-auto overflow-x-hidden rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl",
              isInsideDialog ? "absolute" : "fixed",
            )}
          >
            {options.map((option) => {
              const selected = option.value === value;
              const hasDescription = Boolean(option.description);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;

                    onChange(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "grid w-full grid-cols-[18px_minmax(0,1fr)] gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition",
                    hasDescription ? "items-start" : "items-center",
                    "hover:bg-muted focus:bg-muted",
                    selected && "bg-muted/70",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex w-[18px] shrink-0 items-center justify-center",
                      hasDescription ? "pt-0.5" : "h-[18px]",
                    )}
                  >
                    {selected ? (
                      <Check
                        className="size-4 text-primary"
                        strokeWidth={3.5}
                      />
                    ) : (
                      <span className="block size-4" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {option.label}
                    </span>

                    {option.description && (
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>,
          portalContainer,
        )}
    </div>
  );
}