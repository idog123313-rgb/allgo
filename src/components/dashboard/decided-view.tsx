"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { formatDateRange, formatILS } from "@/lib/format";
import { getDestinationImage } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { optionTotal } from "@/lib/planning";
import { reopenPlan } from "@/lib/store";
import type { Participant, Plan, TripOption } from "@/lib/types";
import { Hotel, ListChecks, Plane, Undo2 } from "lucide-react";

export function DecidedView({
  plan,
  option,
  participants,
  isOrganizer,
  onChanged,
}: {
  plan: Plan;
  option: TripOption;
  participants: Participant[];
  isOrganizer: boolean;
  onChanged: () => void;
}) {
  const { t, lang } = useTranslation();
  const responded = participants.filter((p) => p.respondedAt);
  const image = getDestinationImage(option.name, option.destination);

  async function handleReopen() {
    try {
      await reopenPlan(plan.id);
      onChanged();
    } catch {
      toast.error(t("common.toastFailed"));
    }
  }

  return (
    <div className="flex-1 flex flex-col pb-10">
      <div className="relative h-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/10" />
        <span className="absolute top-4 start-5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground">
          🎉 {t("decided.badge")}
        </span>
        <div className="absolute bottom-10 start-5 text-white">
          <p className="text-sm font-semibold opacity-80">{t("decided.tagline")}</p>
          <h1 className="text-3xl font-extrabold leading-tight">{t("decided.itIs", { name: option.name })}</h1>
          {option.dateStart && option.dateEnd && (
            <p className="text-sm font-semibold opacity-90 mt-1">
              {formatDateRange(option.dateStart, option.dateEnd, lang)}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-card -mt-6 relative shadow-[0_4px_16px_rgba(16,24,40,0.1)] p-4 flex items-center justify-around text-center">
          <Stat value={t("decided.friend", { count: responded.length })} label="" />
          <Stat
            value={plan.tripLengthFlexible ? t("create.flexibleLength") : `${plan.tripLengthNights} ${t("decided.nights")}`}
            label=""
          />
          <Stat value={`~${formatILS(optionTotal(option), lang)}`} label={t("decided.perPerson")} />
        </div>

        <Card className="p-4 gap-3">
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground">{t("decided.whosIn")}</div>
          <div className="flex items-center -space-x-2.5 rtl:space-x-reverse flex-wrap">
            {responded.map((p) => (
              <AvatarInitials key={p.id} name={p.name} size="lg" />
            ))}
          </div>
        </Card>

        <div>
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2.5">
            {t("decided.comingSoon")}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <ComingSoon icon={<Plane className="size-4" />} label={t("decided.findFlights")} soon={t("decided.comingSoon")} />
            <ComingSoon icon={<Hotel className="size-4" />} label={t("decided.findStay")} soon={t("decided.comingSoon")} />
            <ComingSoon icon={<ListChecks className="size-4" />} label={t("decided.itinerary")} soon={t("decided.comingSoon")} />
          </div>
        </div>

        {isOrganizer && (
          <Button variant="ghost" onClick={handleReopen} className="self-center text-muted-foreground gap-1.5">
            <Undo2 className="size-4" />
            {t("decided.reopenPlanning")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-xl font-extrabold">{value}</div>
      {label && <div className="text-xs text-muted-foreground font-medium">{label}</div>}
    </div>
  );
}

function ComingSoon({ icon, label, soon }: { icon: React.ReactNode; label: string; soon: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-3.5 flex flex-col items-center gap-1.5 text-center text-muted-foreground">
      {icon}
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] text-muted-foreground/70">{soon}</div>
    </div>
  );
}
