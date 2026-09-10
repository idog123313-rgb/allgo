"use client";

import { use } from "react";
import { useTrip } from "@/hooks/use-plan";
import { OptionDetail } from "@/components/dashboard/option-detail";
import { PlanNotFound } from "@/components/shared/plan-not-found";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { computeOptionMatch } from "@/lib/planning";

export default function OptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>;
}) {
  const { id, optionId } = use(params);
  const { bundle, loading, notFound, myParticipantId, refresh } = useTrip(id);

  if (loading) return <LoadingScreen />;
  if (notFound || !bundle) return <PlanNotFound />;

  const option = bundle.options.find((o) => o.id === optionId);
  if (!option) return <PlanNotFound />;

  const { participants, availabilities, preferences, votes, plan } = bundle;
  const match = computeOptionMatch(option, participants, availabilities, preferences, votes);
  const myVote = votes.find((v) => v.optionId === option.id && v.participantId === myParticipantId)?.value;
  const myParticipant = participants.find((p) => p.id === myParticipantId) ?? null;
  const isOrganizer = !!myParticipant?.isOrganizer;

  return (
    <OptionDetail
      planId={plan.id}
      shareCode={plan.shareCode}
      option={option}
      match={match}
      participants={participants}
      myParticipantId={myParticipantId}
      myVote={myVote}
      canDecide={isOrganizer && plan.status === "planning"}
      onChanged={refresh}
    />
  );
}
