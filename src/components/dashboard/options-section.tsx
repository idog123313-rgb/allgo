"use client";

import { OptionCard } from "./option-card";
import { AddOptionDialog } from "./add-option-dialog";
import { QuickAddOptions } from "./quick-add-options";
import { computeOptionMatch } from "@/lib/planning";
import { useTranslation } from "@/lib/i18n/context";
import type { Availability, Participant, Preference, TripOption, Vote } from "@/lib/types";
import { MapPinned } from "lucide-react";

export function OptionsSection({
  planId,
  shareCode,
  options,
  participants,
  availabilities,
  preferences,
  votes,
  myParticipantId,
  canAddOption,
  bestWindow,
  onChanged,
}: {
  planId: string;
  shareCode: string;
  options: TripOption[];
  participants: Participant[];
  availabilities: Availability[];
  preferences: Preference[];
  votes: Vote[];
  myParticipantId: string | null;
  canAddOption: boolean;
  bestWindow?: { startIso: string; endIso: string } | null;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const matches = options.map((option) => ({
    option,
    match: computeOptionMatch(option, participants, availabilities, preferences, votes),
  }));
  matches.sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  const leadingId = matches[0]?.option.id;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <MapPinned className="size-4" />
          {t("options.title")}
        </div>
        {canAddOption && myParticipantId && (
          <AddOptionDialog planId={planId} participantId={myParticipantId} onAdded={onChanged} />
        )}
      </div>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("options.empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(({ option, match }) => (
            <OptionCard
              key={option.id}
              planId={shareCode}
              option={option}
              match={match}
              isLeading={option.id === leadingId && options.length > 1}
            />
          ))}
        </div>
      )}

      {canAddOption && myParticipantId && (
        <QuickAddOptions
          planId={planId}
          participantId={myParticipantId}
          existingNames={options.map((o) => o.name)}
          bestWindow={bestWindow}
          onAdded={onChanged}
        />
      )}
    </div>
  );
}
