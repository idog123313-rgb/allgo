"use client";

import { Map, Compass, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export type DashboardTab = "trip" | "options" | "people";

const TABS: { key: DashboardTab; labelKey: string; icon: typeof Map }[] = [
  { key: "trip", labelKey: "nav.trip", icon: Compass },
  { key: "options", labelKey: "nav.options", icon: Map },
  { key: "people", labelKey: "nav.people", icon: Users },
];

export function BottomNav({
  active,
  onChange,
  optionsCount,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  optionsCount: number;
}) {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="max-w-lg mx-auto grid grid-cols-3">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="relative flex flex-col items-center gap-0.5 py-2.5"
            >
              <Icon
                className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {t(tab.labelKey)}
              </span>
              {tab.key === "options" && optionsCount > 0 && (
                <span className="absolute top-1 right-[calc(50%-22px)] rtl:right-auto rtl:left-[calc(50%-22px)] size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {optionsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
