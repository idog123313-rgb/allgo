"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatILS, formatRatio } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/context";
import type { BudgetStats, BudgetThresholdRow } from "@/lib/planning";
import { cn } from "@/lib/utils";

/**
 * A single interpretive sentence about the group's budget spread, with the
 * raw price-point breakdown tucked behind a toggle — not a standalone chart.
 */
export function GroupBudget({
  stats,
  thresholds,
}: {
  stats: BudgetStats | null;
  thresholds: BudgetThresholdRow[];
}) {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!stats) return null;

  const medianRow = thresholds.find((r) => r.amount === stats.median);
  const headline =
    medianRow && medianRow.fitCount < medianRow.total
      ? t("groupBudget.headline", { amount: formatILS(stats.median, lang), count: medianRow.fitCount, total: medianRow.total })
      : t("groupBudget.headlineAll", { amount: formatILS(stats.median, lang) });

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{headline}</p>
        {thresholds.length > 1 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0"
          >
            {expanded ? t("groupBudget.hide") : t("groupBudget.seeBreakdown")}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-1 mb-0.5">
            {t("groupBudget.rangeTitle")}
          </div>
          {thresholds.map((row) => (
            <div key={row.amount} className="flex items-center justify-between text-sm">
              <span className="font-semibold">{formatILS(row.amount, lang)}</span>
              <span className={row.fitCount === row.total ? "text-primary font-semibold" : "text-muted-foreground"}>
                {row.fitCount === row.total
                  ? t("groupBudget.fitsEveryone")
                  : t("groupBudget.fitsRatio", { ratio: formatRatio(row.fitCount, row.total, lang) })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
