"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatILS } from "@/lib/format";
import { DEMO_OPTIONS } from "@/lib/demo-options";
import { addOption } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";

export function QuickAddOptions({
  planId,
  participantId,
  existingNames,
  bestWindow,
  onAdded,
}: {
  planId: string;
  participantId: string;
  existingNames: string[];
  bestWindow?: { startIso: string; endIso: string } | null;
  onAdded: () => void;
}) {
  const { t, lang } = useTranslation();
  const [addingName, setAddingName] = useState<string | null>(null);
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const suggestions = DEMO_OPTIONS.filter((d) => !existing.has(d.name.toLowerCase()));

  if (suggestions.length === 0) return null;

  async function handleAdd(demo: (typeof DEMO_OPTIONS)[number]) {
    setAddingName(demo.name);
    try {
      await addOption(planId, participantId, {
        name: demo.name,
        destination: demo.destination,
        imageEmoji: demo.imageEmoji,
        dateStart: bestWindow?.startIso ?? null,
        dateEnd: bestWindow?.endIso ?? null,
        flightEstimate: demo.flightEstimate,
        hotelEstimate: demo.hotelEstimate,
        otherEstimate: demo.otherEstimate,
        externalLink: null,
        notes: null,
        tripTypes: demo.tripTypes,
      });
      toast.success(t("options.toastAdded", { name: demo.name }));
      onAdded();
    } catch {
      toast.error(t("common.toastFailed"));
    } finally {
      setAddingName(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div>
        <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
          {t("options.quickAddTitle")}
        </div>
        <p className="text-xs text-muted-foreground">{t("options.quickAddHint")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((demo) => {
          const total = demo.flightEstimate + demo.hotelEstimate + demo.otherEstimate;
          return (
            <button
              key={demo.name}
              type="button"
              disabled={addingName !== null}
              onClick={() => handleAdd(demo)}
              className="flex items-center gap-2 rounded-full border border-dashed border-border bg-card px-3.5 py-2 text-sm font-semibold transition-all active:scale-95 hover:border-primary/40 disabled:opacity-50"
            >
              <span>{demo.imageEmoji}</span>
              {demo.name}
              <span className="text-xs font-normal text-muted-foreground">{formatILS(total, lang)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
