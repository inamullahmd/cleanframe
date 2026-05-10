"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const savedTheme = window.localStorage.getItem("cleanframe-theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("cleanframe-theme", theme);
  window.dispatchEvent(
    new CustomEvent("cleanframe-theme-change", {
      detail: theme,
    }),
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = getInitialTheme();

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}