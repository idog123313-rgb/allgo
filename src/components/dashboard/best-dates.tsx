"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDateRange, formatRatio } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/context";
import type { DateWindowScore } from "@/lib/planning";
import { cn } from "@/lib/utils";

/**
 * Surfaces the conclusion ("best weekend") instead of a full analytics
 * table — alternatives stay one tap away instead of always on screen.
 */
export function BestDates({ windows }: { windows: DateWindowScore[] }) {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (windows.length === 0) return null;

  const [top, ...rest] = windows;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            {t("bestDates.weekendLabel")}
          </div>
          <div className="text-base font-extrabold">{formatDateRange(top.startIso, top.endIso, lang)}</div>
        </div>
        <div className="text-end shrink-0">
          <div className="text-sm font-bold text-primary">
            {formatRatio(top.availableCount, top.total, lang)} {t("bestDates.available")}
          </div>
          {top.maybeCount > 0 && (
            <div className="text-[11px] text-muted-foreground">
              {top.maybeCount} {t("bestDates.maybe")}
            </div>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground self-start"
          >
            {expanded ? t("bestDates.hide") : t("bestDates.seeOther")}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>

          {expanded && (
            <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
              {rest.map((w) => (
                <div key={w.startIso} className="flex items-center justify-between px-0.5 py-1 text-sm">
                  <span className="font-semibold text-foreground">{formatDateRange(w.startIso, w.endIso, lang)}</span>
                  <span className="text-muted-foreground">
                    {formatRatio(w.availableCount, w.total, lang)} {t("bestDates.available")}
                    {w.maybeCount > 0 && (
                      <span className="text-lilac-deep">
                        {" "}
                        · {w.maybeCount} {t("bestDates.maybe")}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
