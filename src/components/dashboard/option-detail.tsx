"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { toast } from "sonner";
import { MatchBadge } from "./match-badge";
import { formatDateRange, formatDateShort, formatILS, formatRatio } from "@/lib/format";
import { getDestinationImage } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { optionTotal, type OptionMatch } from "@/lib/planning";
import { castVote, decidePlan } from "@/lib/store";
import type { Participant, TripOption, VoteValue } from "@/lib/types";
import { cn } from "@/lib/utils";

const VOTE_CONFIG: { value: VoteValue; emoji: string; labelKey: string }[] = [
  { value: "love", emoji: "❤️", labelKey: "optionDetail.loveIt" },
  { value: "like", emoji: "👍", labelKey: "optionDetail.works" },
  { value: "no", emoji: "👎", labelKey: "optionDetail.no" },
];

export function OptionDetail({
  planId,
  shareCode,
  option,
  match,
  participants,
  myParticipantId,
  myVote,
  canDecide,
  onChanged,
}: {
  planId: string;
  shareCode: string;
  option: TripOption;
  match: OptionMatch;
  participants: Participant[];
  myParticipantId: string | null;
  myVote: VoteValue | undefined;
  canDecide: boolean;
  onChanged: () => void;
}) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const total = optionTotal(option);
  const image = getDestinationImage(option.name, option.destination);
  const responded = participants.filter((p) => p.respondedAt);

  async function handleVote(value: VoteValue) {
    if (!myParticipantId) return;
    setVoting(true);
    try {
      await castVote(planId, option.id, myParticipantId, value);
      onChanged();
    } catch {
      toast.error(t("common.toastFailed"));
    } finally {
      setVoting(false);
    }
  }

  async function handleConfirmDecide() {
    try {
      await decidePlan(planId, option.id);
      setConfirmOpen(false);
      onChanged();
      router.push(`/trip/${shareCode}`);
    } catch {
      toast.error(t("common.toastFailed"));
    }
  }

  return (
    <div className="flex-1 flex flex-col pb-10">
      <div className="relative h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/10" />
        <Link
          href={`/trip/${shareCode}`}
          className="absolute top-4 start-4 size-9 rounded-full bg-white/90 flex items-center justify-center"
        >
          <ArrowLeft className="size-4 text-neutral-900 rtl:rotate-180" />
        </Link>
        <div className="absolute bottom-9 start-5 text-white">
          <div className="text-3xl font-extrabold leading-tight">{option.name}</div>
          <div className="text-sm font-medium opacity-90">{option.destination}</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 -mt-8 relative flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-card shadow-[0_4px_16px_rgba(16,24,40,0.1)] p-4 flex items-center justify-between">
          <div>
            {option.dateStart && option.dateEnd && (
              <div className="text-sm font-bold">{formatDateRange(option.dateStart, option.dateEnd, lang)}</div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">{t("optionDetail.groupMatch")}</div>
          </div>
          <MatchBadge percent={match.matchPercent} size="lg" />
        </div>

        <div>
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
            {t("optionDetail.whosIn")}
          </div>
          <div className="flex items-center -space-x-2.5 rtl:space-x-reverse">
            {responded.map((p) => (
              <AvatarInitials key={p.id} name={p.name} size="sm" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label={t("optionDetail.availability")}
            value={formatRatio(match.availableCount, match.totalParticipants, lang)}
            hint={t("optionDetail.canMakeIt")}
          />
          <InfoCard
            label={t("optionDetail.budgetFit")}
            value={formatRatio(match.budgetFitCount, match.totalParticipants, lang)}
            hint={t("optionDetail.withinBudget")}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">
            {t("optionDetail.estimatedCost")}
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm text-muted-foreground">{t("optionDetail.totalPerPerson")}</span>
            <span className="text-2xl font-extrabold">{formatILS(total, lang)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
            <CostCell label={t("optionDetail.flight")} value={option.flightEstimate} lang={lang} />
            <CostCell label={t("optionDetail.stay")} value={option.hotelEstimate} lang={lang} />
            <CostCell label={t("optionDetail.other")} value={option.otherEstimate} lang={lang} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center pt-3">
            {option.priceSource === "manual"
              ? t("optionDetail.priceManual")
              : t("optionDetail.priceChecked", { date: formatDateShort(option.priceCheckedAt, lang) })}
          </p>
        </div>

        {option.notes && <p className="text-sm text-muted-foreground">{option.notes}</p>}

        {option.externalLink && (
          <a
            href={option.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline w-fit"
          >
            <ExternalLink className="size-3.5" /> {t("optionDetail.viewListing")}
          </a>
        )}

        <div>
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
            {t("optionDetail.voting")}
          </div>
          <div className="flex flex-col gap-2">
            {VOTE_CONFIG.map((v) => {
              const count = v.value === "love" ? match.loveCount : v.value === "like" ? match.likeCount : match.noCount;
              const selected = myVote === v.value;
              return (
                <button
                  key={v.value}
                  disabled={voting || !myParticipantId}
                  onClick={() => handleVote(v.value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 transition-all active:scale-[0.99]",
                    selected ? "border-primary bg-sky" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <span>{v.emoji}</span> {t(v.labelKey)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {canDecide && (
          <Button size="lg" variant="blush" className="w-full" onClick={() => setConfirmOpen(true)}>
            {t("optionDetail.chooseThisTrip")}
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("decide.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("decide.confirmSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted p-4 flex flex-col gap-1">
            <div className="text-lg font-extrabold">{option.name}</div>
            {option.dateStart && option.dateEnd && (
              <div className="text-sm text-muted-foreground">{formatDateRange(option.dateStart, option.dateEnd, lang)}</div>
            )}
            <div className="text-sm font-semibold">
              {formatILS(total, lang)}
              {t("decide.perPerson")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="blush" onClick={handleConfirmDecide}>
              {t("decide.confirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-xl font-extrabold mt-0.5">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function CostCell({ label, value, lang }: { label: string; value: number; lang: "en" | "he" }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold">{formatILS(value, lang)}</div>
    </div>
  );
}
