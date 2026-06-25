"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Determine initial theme on mount
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle Theme"
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted hover:text-brand-green-500 dark:hover:text-brand-gold-500 hover:bg-gray-100 dark:hover:bg-dark-bg/60 transition-all duration-300 cursor-pointer active:scale-90"
    >
      <span className="sr-only">Toggle Theme</span>
      <Sun
        size={20}
        className={`absolute transition-all duration-500 transform ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100 text-brand-gold-500"
            : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        size={20}
        className={`absolute transition-all duration-500 transform ${
          theme === "light"
            ? "rotate-0 scale-100 opacity-100 text-brand-green-500"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
