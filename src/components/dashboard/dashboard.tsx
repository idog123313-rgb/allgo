"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RoomHeader } from "./room-header";
import { NextStepCard } from "./next-step-card";
import { Destinations } from "./destinations";
import { BestDates } from "./best-dates";
import { GroupBudget } from "./group-budget";
import { OptionsSection } from "./options-section";
import { PeoplePanel } from "./people-panel";
import { DecidedView } from "./decided-view";
import { BottomNav, type DashboardTab } from "./bottom-nav";
import {
  computeBestDateWindows,
  computeBlockers,
  computeBudgetStats,
  computeBudgetThresholds,
  computeOptionMatch,
  computePrimaryAction,
  computeWaitingFor,
  type Blocker,
  type PrimaryAction,
} from "@/lib/planning";
import { useTranslation } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";
import { formatDateRange, formatILS, formatRatio } from "@/lib/format";
import { askBlockerMessage, inviteMessage, reminderMessage, shareText } from "@/lib/whatsapp";
import type { PlanBundle } from "@/lib/types";

export function Dashboard({
  bundle,
  myParticipantId,
  onChanged,
}: {
  bundle: PlanBundle;
  myParticipantId: string | null;
  onChanged: () => void;
}) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<DashboardTab>("trip");
  const { plan, participants, availabilities, preferences, options, votes } = bundle;
  const myParticipant = participants.find((p) => p.id === myParticipantId) ?? null;
  const isOrganizer = !!myParticipant?.isOrganizer;

  if (plan.status === "decided") {
    const decidedOption = options.find((o) => o.id === plan.decidedOptionId);
    if (decidedOption) {
      return (
        <DecidedView
          plan={plan}
          option={decidedOption}
          participants={participants}
          isOrganizer={isOrganizer}
          onChanged={onChanged}
        />
      );
    }
  }

  const bestDates = computeBestDateWindows(plan, participants, availabilities);
  const budgetStats = computeBudgetStats(preferences);
  const budgetThresholds = computeBudgetThresholds(preferences);
  const waitingFor = computeWaitingFor(plan, participants);
  const blockers = computeBlockers(plan, participants, availabilities, preferences, options, votes);

  const matches = options.map((option) => ({
    option,
    match: computeOptionMatch(option, participants, availabilities, preferences, votes),
  }));

  const rawAction = computePrimaryAction(participants, waitingFor, options, matches, votes, blockers);
  const action = rawAction?.kind === "lockTrip" && !isOrganizer ? null : rawAction;

  async function handlePrimaryAction(action: PrimaryAction) {
    switch (action.kind) {
      case "invite": {
        const result = await shareText(plan.name, inviteMessage(plan, t));
        if (result === "copied") toast.success(t("invite.toastMessageCopied"));
        if (result === "failed") toast.error(t("invite.toastShareFailed"));
        break;
      }
      case "remind": {
        const result = await shareText(plan.name, reminderMessage(plan, t));
        if (result === "copied") toast.success(t("people.toastReminderCopied"));
        if (result === "failed") toast.error(t("invite.toastShareFailed"));
        break;
      }
      case "addOptions":
      case "compareCheaper":
        setTab("options");
        break;
      case "vote":
      case "lockTrip":
        router.push(`/trip/${plan.shareCode}/option/${action.optionId}`);
        break;
      case "askPerson": {
        const result = await shareText(plan.name, askBlockerMessage(plan, action.name, t));
        if (result === "copied") toast.success(t("people.toastReminderCopied"));
        if (result === "failed") toast.error(t("invite.toastShareFailed"));
        break;
      }
      case "seeDates":
        setTab("trip");
        document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "compareFinalists":
        document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-lg mx-auto w-full px-5 flex-1 pb-24">
        <RoomHeader plan={plan} participants={participants} />

        {tab === "trip" && (
          <div className="flex flex-col gap-4">
            <NextStepMessage blockers={blockers} action={action} t={t} lang={lang} onAction={handlePrimaryAction} />

            <Destinations shareCode={plan.shareCode} matches={matches} onSeeAll={() => setTab("options")} />

            <BestDates windows={bestDates} />
            <GroupBudget stats={budgetStats} thresholds={budgetThresholds} />
          </div>
        )}

        {tab === "options" && (
          <OptionsSection
            planId={plan.id}
            shareCode={plan.shareCode}
            options={options}
            participants={participants}
            availabilities={availabilities}
            preferences={preferences}
            votes={votes}
            myParticipantId={myParticipantId}
            canAddOption={!!myParticipantId}
            bestWindow={bestDates[0] ?? null}
            onChanged={onChanged}
          />
        )}

        {tab === "people" && (
          <PeoplePanel
            plan={plan}
            participants={participants}
            isOrganizer={isOrganizer}
            showSwitchPerson={!!myParticipantId}
            onSwitched={onChanged}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} optionsCount={options.length} />
    </div>
  );
}

function NextStepMessage({
  blockers,
  action,
  t,
  lang,
  onAction,
}: {
  blockers: Blocker[];
  action: PrimaryAction | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: Lang;
  onAction: (action: PrimaryAction) => void;
}) {
  const top = blockers[0];

  let lead: string;
  let detail: string | undefined;

  if (top) {
    const vars = blockerVars(top, lang);
    lead = t(`blockers.${top.kind}.lead`, vars);
    detail = t(`blockers.${top.kind}.detail`, vars);
  } else if (action) {
    switch (action.kind) {
      case "invite":
        lead = t("nextStep.invite");
        break;
      case "remind":
        lead = t("nextStep.remind", { count: action.names.length });
        break;
      case "addOptions":
        lead = t("nextStep.addOptions");
        break;
      case "vote":
        lead = t("nextStep.vote");
        break;
      case "compareFinalists":
        lead = t("nextStep.compareFinalists");
        break;
      case "lockTrip":
        lead = t("nextStep.lockTrip", { option: action.optionName });
        break;
      default:
        lead = t("nextStep.invite");
    }
  } else {
    return null;
  }

  if (!action) return <NextStepCard lead={lead} detail={detail} />;

  return (
    <NextStepCard
      lead={lead}
      detail={detail}
      buttonLabel={primaryActionLabel(action, t)}
      onButtonClick={() => onAction(action)}
    />
  );
}

function blockerVars(blocker: Blocker, lang: Lang): Record<string, string | number> {
  switch (blocker.kind) {
    case "dateSingleBlocker":
      return { name: blocker.name, dates: formatDateRange(blocker.startIso, blocker.endIso, lang) };
    case "dateImprovement":
      return {
        fromRatio: formatRatio(blocker.fromCount, blocker.total, lang),
        toRatio: formatRatio(blocker.toCount, blocker.total, lang),
        dates: formatDateRange(blocker.startIso, blocker.endIso, lang),
      };
    case "budgetCeiling":
      return { option: blocker.optionName, amount: formatILS(blocker.ceiling, lang) };
    case "budgetOverBy":
      return { option: blocker.optionName, name: blocker.name, delta: formatILS(blocker.delta, lang) };
    case "popularButExpensive":
      return { option: blocker.optionName, count: blocker.excludedCount };
    case "readyToDecide":
      return { option: blocker.optionName };
  }
}

function primaryActionLabel(action: PrimaryAction, t: (key: string, vars?: Record<string, string | number>) => string): string {
  switch (action.kind) {
    case "invite":
      return t("primaryAction.invite");
    case "remind":
      return action.names.length === 1
        ? t("primaryAction.remindOne", { name: action.names[0] })
        : t("primaryAction.remindMany", { count: action.names.length });
    case "addOptions":
      return t("primaryAction.addOptions");
    case "vote":
      return t("primaryAction.vote");
    case "askPerson":
      return t("primaryAction.askPerson", { name: action.name });
    case "seeDates":
      return t("primaryAction.seeDates");
    case "compareCheaper":
      return t("primaryAction.compareCheaper");
    case "compareFinalists":
      return t("primaryAction.compareFinalists");
    case "lockTrip":
      return t("primaryAction.lockTrip", { name: action.optionName });
  }
}
