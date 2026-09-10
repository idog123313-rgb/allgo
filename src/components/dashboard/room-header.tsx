"use client";

import { AvatarInitials } from "@/components/shared/avatar-initials";
import { useTranslation } from "@/lib/i18n/context";
import { computeWaitingFor } from "@/lib/planning";
import type { Participant, Plan } from "@/lib/types";

const MAX_SLOTS = 8;

/** The room's masthead: trip name, who's in (with empty slots for who's missing), one status line. */
export function RoomHeader({ plan, participants }: { plan: Plan; participants: Participant[] }) {
  const { t } = useTranslation();
  const responded = participants.filter((p) => p.respondedAt);
  const waitingFor = computeWaitingFor(plan, participants);
  const total =
    plan.expectedParticipantNames.length > 0
      ? new Set([
          ...plan.expectedParticipantNames.map((n) => n.toLowerCase()),
          ...responded.map((p) => p.name.toLowerCase()),
        ]).size
      : null;

  const inLine = total
    ? t("room.inOfTotal", { count: responded.length, total })
    : t("room.inNoTotal", { count: responded.length });

  let status: string;
  if (responded.length === 0) status = t("room.statusGettingStarted");
  else if (waitingFor.length === 0 && total) status = t("room.statusAllIn");
  else if (waitingFor.length === 1) status = t("room.statusWaitingOne", { name: waitingFor[0] });
  else if (waitingFor.length > 1) status = t("room.statusWaitingMany", { count: waitingFor.length });
  else status = t("room.statusAlmostReady");

  const shownResponded = responded.slice(0, MAX_SLOTS);
  const remainingSlots = Math.max(MAX_SLOTS - shownResponded.length, 0);
  const shownWaiting = waitingFor.slice(0, remainingSlots);
  const overflow = responded.length + waitingFor.length - shownResponded.length - shownWaiting.length;

  return (
    <div className="flex flex-col gap-2.5 py-4">
      <div>
        <h1 className="text-xl font-extrabold leading-tight truncate">{plan.name}</h1>
        <p className="text-sm text-muted-foreground">{inLine}</p>
      </div>

      <div className="flex items-center -space-x-2.5 rtl:space-x-reverse">
        {shownResponded.map((p) => (
          <AvatarInitials key={p.id} name={p.name} size="sm" />
        ))}
        {shownWaiting.map((name) => (
          <div
            key={name}
            title={name}
            className="size-7 rounded-full border-2 border-dashed border-muted-foreground/30 bg-background shrink-0"
          />
        ))}
        {overflow > 0 && (
          <div className="size-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            +{overflow}
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground">{status}</p>
    </div>
  );
}
