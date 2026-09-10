"use client";

import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="fixed top-3 end-3 z-50 flex items-center gap-0.5 rounded-full border border-border bg-card/95 backdrop-blur p-0.5 text-xs shadow-sm">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 rounded-full font-semibold transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("he")}
        className={cn(
          "px-2.5 py-1 rounded-full font-semibold transition-colors",
          lang === "he" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        עב
      </button>
    </div>
  );
}
