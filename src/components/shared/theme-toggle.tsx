"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className={cn(
        "fixed top-14 end-3 z-50 flex items-center justify-center size-8 rounded-full border border-border bg-card/95 backdrop-blur shadow-sm transition-colors",
        "text-muted-foreground hover:text-foreground"
      )}
    >
      {mounted && (isDark ? <Sun className="size-4" /> : <Moon className="size-4" />)}
    </button>
  );
}
