"use client";

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
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--text)] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:shadow-md"
      aria-label="Toggle color theme"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-teal-400/10 to-indigo-400/10 opacity-0 transition group-hover:opacity-100" />
      <span className="relative">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="relative hidden sm:inline">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}