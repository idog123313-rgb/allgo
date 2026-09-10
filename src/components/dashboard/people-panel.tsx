"use client";

import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { toast } from "sonner";
import { reminderMessage, shareText } from "@/lib/whatsapp";
import { useAuth } from "@/lib/auth/context";
import { useTranslation } from "@/lib/i18n/context";
import type { Participant, Plan } from "@/lib/types";

export function PeoplePanel({
  plan,
  participants,
  isOrganizer,
  showSwitchPerson,
  onSwitched,
}: {
  plan: Plan;
  participants: Participant[];
  isOrganizer: boolean;
  showSwitchPerson: boolean;
  onSwitched: () => void;
}) {
  const { t } = useTranslation();
  const { switchIdentity } = useAuth();
  const responded = participants.filter((p) => p.respondedAt);
  const respondedNames = new Set(responded.map((p) => p.name.toLowerCase()));
  const expected = plan.expectedParticipantNames;
  const waitingFor = expected.filter((n) => !respondedNames.has(n.toLowerCase()));

  async function handleRemind() {
    const result = await shareText(plan.name, reminderMessage(plan, t));
    if (result === "copied") toast.success(t("people.toastReminderCopied"));
    if (result === "failed") toast.error(t("invite.toastShareFailed"));
  }

  async function handleSwitchPerson() {
    await switchIdentity();
    onSwitched();
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
          {t("people.in", { count: responded.length })}
        </div>
        <div className="flex flex-col gap-2">
          {responded.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("people.noResponses")}</p>
          )}
          {responded.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <AvatarInitials name={p.name} size="sm" />
              <span className="text-sm font-semibold flex-1">{p.name}</span>
              {p.isOrganizer && (
                <span className="text-[10px] font-bold text-primary bg-sky px-2 py-0.5 rounded-full">
                  {t("people.organizer")}
                </span>
              )}
              <Check className="size-4 text-primary" />
            </div>
          ))}
        </div>
      </div>

      {waitingFor.length > 0 && (
        <div>
          <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
            {t("people.waitingOn", { count: waitingFor.length })}
          </div>
          <div className="flex flex-col gap-2">
            {waitingFor.map((n) => (
              <div key={n} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-2.5">
                <div className="size-9 rounded-full border-2 border-dashed border-muted-foreground/30" />
                <span className="text-sm font-semibold flex-1 text-muted-foreground">{n}</span>
              </div>
            ))}
          </div>
          {isOrganizer && (
            <Button onClick={handleRemind} variant="blush" className="w-full mt-3 gap-1.5">
              <Bell className="size-4" />
              {t("people.remindThem")}
            </Button>
          )}
        </div>
      )}

      {waitingFor.length === 0 && isOrganizer && expected.length === 0 && (
        <Button onClick={handleRemind} variant="secondary" className="w-full gap-1.5">
          <Bell className="size-4" />
          {t("people.copyReminder")}
        </Button>
      )}

      {showSwitchPerson && (
        <button
          onClick={handleSwitchPerson}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground self-center mt-2"
        >
          {t("people.switchPerson")}
        </button>
      )}
    </div>
  );
}
