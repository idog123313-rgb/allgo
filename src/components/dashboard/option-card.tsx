"use client";

import Link from "next/link";
import { formatDateRange, formatILS, formatRatio } from "@/lib/format";
import { getDestinationImage } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { optionTotal, type OptionMatch } from "@/lib/planning";
import type { TripOption } from "@/lib/types";
import { MatchBadge } from "./match-badge";
import { Sparkles } from "lucide-react";

export function OptionCard({
  planId,
  option,
  match,
  isLeading,
}: {
  planId: string;
  option: TripOption;
  match: OptionMatch;
  isLeading: boolean;
}) {
  const { t, lang } = useTranslation();
  const total = optionTotal(option);
  const image = getDestinationImage(option.name, option.destination);

  return (
    <Link
      href={`/trip/${planId}/option/${option.id}`}
      className="block rounded-2xl border border-border bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.06)] active:scale-[0.99] transition-transform"
    >
      <div className="relative h-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        {isLeading && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-foreground">
            <Sparkles className="size-3 text-primary" /> {t("options.leadingBadge")}
          </span>
        )}
        <div className="absolute top-2.5 right-2.5">
          <MatchBadge percent={match.matchPercent} size="sm" className="ring-2 ring-white/80" />
        </div>
        <div className="absolute bottom-2.5 left-3.5 text-white">
          <div className="text-lg font-extrabold leading-tight">{option.name}</div>
          <div className="text-xs font-medium opacity-90">{option.destination}</div>
        </div>
      </div>

      <div className="px-3.5 py-3 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {option.dateStart && option.dateEnd && (
            <span className="text-xs font-semibold text-muted-foreground">
              {formatDateRange(option.dateStart, option.dateEnd, lang)}
            </span>
          )}
          <span className="text-sm font-bold text-foreground">
            {formatILS(total, lang)} {t("options.perPerson")}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">
            {formatRatio(match.availableCount, match.totalParticipants, lang)} {t("options.available")}
          </span>
          <span className="text-xs text-muted-foreground">
            {match.loveCount > 0 && <span>❤️ {match.loveCount} </span>}
            {match.likeCount > 0 && <span>👍 {match.likeCount}</span>}
            {match.loveCount === 0 && match.likeCount === 0 && <span>{t("options.noVotes")}</span>}
          </span>
        </div>
      </div>
    </Link>
  );
}
