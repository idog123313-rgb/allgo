"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, ThumbsDown, ThumbsUp, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateRange, formatILS, formatRatio } from "@/lib/format";
import { getDestinationImage } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { castVote } from "@/lib/store";
import { compareTopOptions, computeOptionMatch, optionTotal, type OptionMatch } from "@/lib/planning";
import type { Availability, Participant, Preference, TripOption, Vote, VoteValue } from "@/lib/types";

export function FindTripsResults({
  planId,
  shareCode,
  options,
  participants,
  availabilities,
  preferences,
  votes,
  myParticipantId,
  onDone,
}: {
  planId: string;
  shareCode: string;
  options: TripOption[];
  participants: Participant[];
  availabilities: Availability[];
  preferences: Preference[];
  votes: Vote[];
  myParticipantId: string | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [liveVotes, setLiveVotes] = useState<Vote[]>(votes);

  const matches = options.map((option) => ({
    option,
    match: computeOptionMatch(option, participants, availabilities, preferences, liveVotes),
  }));
  const cheapestTotal = Math.min(...options.map((o) => optionTotal(o)));
  const compare = compareTopOptions(matches);

  async function handleReact(optionId: string, value: VoteValue) {
    if (!myParticipantId) return;
    try {
      const vote = await castVote(planId, optionId, myParticipantId, value);
      setLiveVotes((prev) => [...prev.filter((v) => !(v.optionId === optionId && v.participantId === myParticipantId)), vote]);
    } catch {
      toast.error(t("common.toastFailed"));
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto w-full px-5 py-6 flex flex-col gap-5 pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold leading-tight">{t("findTrips.resultsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("findTrips.resultsSubtitle")}</p>
        </div>

        {compare && (
          <p className="text-sm font-medium text-blue-deep bg-sky rounded-xl px-3.5 py-2.5">
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

        <div className="flex flex-col gap-4">
          {matches.map(({ option, match }) => (
            <ResultCard
              key={option.id}
              shareCode={shareCode}
              option={option}
              match={match}
              isCheapest={optionTotal(option) === cheapestTotal}
              myVote={liveVotes.find((v) => v.optionId === option.id && v.participantId === myParticipantId)?.value}
              onReact={(value) => handleReact(option.id, value)}
            />
          ))}
        </div>

        <Button size="lg" variant="secondary" className="w-full" onClick={onDone}>
          {t("findTrips.backToRoom")}
        </Button>
      </div>
    </div>
  );
}

function ResultCard({
  shareCode,
  option,
  match,
  isCheapest,
  myVote,
  onReact,
}: {
  shareCode: string;
  option: TripOption;
  match: OptionMatch;
  isCheapest: boolean;
  myVote: VoteValue | undefined;
  onReact: (value: VoteValue) => void;
}) {
  const { t, lang } = useTranslation();
  const image = getDestinationImage(option.name, option.destination);
  const total = optionTotal(option);

  const label =
    match.availabilityFit === 1 && match.budgetFit === 1
      ? t("findTrips.worksForEveryone")
      : isCheapest
        ? t("findTrips.cheapestOption")
        : match.budgetFit === 1
          ? t("findTrips.fitsEveryonesBudget")
          : match.availabilityFit === 1
            ? t("findTrips.greatDates")
            : t("findTrips.greatFit");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_rgba(16,24,40,0.08)]">
      <div className="relative h-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/5" />
        <div className="absolute bottom-3 start-4 text-white">
          <div className="text-xl font-extrabold leading-tight">{option.name}</div>
          {option.dateStart && option.dateEnd && (
            <div className="text-sm font-medium opacity-90">{formatDateRange(option.dateStart, option.dateEnd, lang)}</div>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("findTrips.flight")}</div>
            <div className="font-bold">{t("findTrips.priceFrom", { amount: formatILS(option.flightEstimate, lang) })}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("findTrips.stay")}</div>
            <div className="font-bold">{t("findTrips.priceFrom", { amount: formatILS(option.hotelEstimate, lang) })}</div>
          </div>
        </div>

        <div className="flex items-baseline justify-between rounded-xl bg-sky px-3.5 py-2.5">
          <span className="text-xs font-semibold text-blue-deep uppercase tracking-wide">{t("findTrips.from")}</span>
          <span className="text-lg font-extrabold text-blue-deep">
            {formatILS(total, lang)} {t("options.perPerson")}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {formatRatio(match.availableCount, match.totalParticipants, lang)} {t("findTrips.canGo")}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="size-4" />
            {t("findTrips.fitsBudgets", { ratio: formatRatio(match.budgetFitCount, match.totalParticipants, lang) })}
          </span>
        </div>

        <span className="text-sm font-bold text-primary">{label}</span>

        <div className="grid grid-cols-4 gap-2 pt-1">
          <Link
            href={`/trip/${shareCode}/option/${option.id}`}
            className="col-span-1 flex items-center justify-center rounded-xl border border-border text-xs font-semibold py-2.5 hover:border-primary/40"
          >
            {t("findTrips.view")}
          </Link>
          <button
            onClick={() => onReact("love")}
            className={`flex items-center justify-center rounded-xl border py-2.5 transition-all active:scale-95 ${myVote === "love" ? "border-primary bg-sky" : "border-border"}`}
          >
            <Heart className="size-4" />
          </button>
          <button
            onClick={() => onReact("like")}
            className={`flex items-center justify-center rounded-xl border py-2.5 transition-all active:scale-95 ${myVote === "like" ? "border-primary bg-sky" : "border-border"}`}
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            onClick={() => onReact("no")}
            className={`flex items-center justify-center rounded-xl border py-2.5 transition-all active:scale-95 ${myVote === "no" ? "border-primary bg-sky" : "border-border"}`}
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
