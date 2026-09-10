"use client";

import Link from "next/link";
import { Users, Heart } from "lucide-react";
import { formatDateRange, formatILS, formatRatio } from "@/lib/format";
import { getDestinationImage } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { compareTopOptions, optionTotal, type OptionWithMatch } from "@/lib/planning";

export function Destinations({
  shareCode,
  matches,
  onSeeAll,
}: {
  shareCode: string;
  matches: OptionWithMatch[];
  onSeeAll: () => void;
}) {
  const { t, lang } = useTranslation();
  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  const compare = compareTopOptions(sorted);
  const shown = compare ? [compare.leader, compare.follower] : [sorted[0]];

  const followerLabel = compare
    ? compare.followerFitsEveryone
      ? t("destinations.worksForEveryone")
      : compare.followerCheaper
        ? t("destinations.bestValue")
        : t("destinations.runnerUp")
    : null;

  return (
    <div id="destinations" className="flex flex-col gap-3">
      <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {t("destinations.title")}
      </div>

      <div className="flex flex-col gap-3">
        {shown.map((m, i) => (
          <DestinationCard
            key={m.option.id}
            shareCode={shareCode}
            item={m}
            label={i === 0 ? t("destinations.groupFavorite") : followerLabel!}
            lang={lang}
          />
        ))}
      </div>

      {compare && (
        <p className="text-sm text-muted-foreground px-0.5">
          {t("destinations.comparePopular", { name: compare.leader.option.name })}{" "}
          {compare.followerFitsEveryone && compare.followerCheaper
            ? t("destinations.compareCheaperFits", { name: compare.follower.option.name })
            : compare.followerFitsEveryone
              ? t("destinations.compareFits", { name: compare.follower.option.name })
              : compare.followerCheaper
                ? t("destinations.compareCheaper", { name: compare.follower.option.name })
                : ""}
        </p>
      )}

      {matches.length > shown.length && (
        <button onClick={onSeeAll} className="text-xs font-semibold text-primary self-start">
          {t("destinations.seeAll", { count: matches.length })}
        </button>
      )}
    </div>
  );
}

function DestinationCard({
  shareCode,
  item,
  label,
  lang,
}: {
  shareCode: string;
  item: OptionWithMatch;
  label: string;
  lang: "en" | "he";
}) {
  const { t } = useTranslation();
  const { option, match } = item;
  const total = optionTotal(option);
  const image = getDestinationImage(option.name, option.destination);

  return (
    <Link
      href={`/trip/${shareCode}/option/${option.id}`}
      className="block rounded-2xl overflow-hidden border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_rgba(16,24,40,0.08)] active:scale-[0.99] transition-transform"
    >
      <div className="relative h-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/5" />
        <span className="absolute top-3 start-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-900">
          {label}
        </span>
        <div className="absolute bottom-3 start-4 text-white">
          <div className="text-2xl font-extrabold leading-tight">{option.name}</div>
          {option.dateStart && option.dateEnd && (
            <div className="text-sm font-medium opacity-90">{formatDateRange(option.dateStart, option.dateEnd, lang)}</div>
          )}
        </div>
        <span className="absolute bottom-3 end-4 text-white text-xs font-semibold opacity-90">
          {t("destinations.matchLabel", { percent: match.matchPercent })}
        </span>
      </div>

      <div className="px-4 py-3 flex items-center justify-between text-sm">
        <span className="font-bold">{formatILS(total, lang)}</span>
        <span className="flex items-center gap-3 text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {t("destinations.canGo", { ratio: formatRatio(match.availableCount, match.totalParticipants, lang) })}
          </span>
          {match.loveCount > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" />
              {t("destinations.loveIt", { count: match.loveCount })}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
