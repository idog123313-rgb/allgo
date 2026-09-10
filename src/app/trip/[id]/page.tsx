"use client";

import { use } from "react";
import { useTrip } from "@/hooks/use-plan";
import { JoinFlow } from "@/components/join/join-flow";
import { Dashboard } from "@/components/dashboard/dashboard";
import { PlanNotFound } from "@/components/shared/plan-not-found";
import { LoadingScreen } from "@/components/shared/loading-screen";

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { overview, bundle, loading, notFound, refresh } = useTrip(id);

  if (loading) return <LoadingScreen />;
  if (notFound || !overview) return <PlanNotFound />;

  if (!overview.isMember) {
    return (
      <JoinFlow
        plan={overview.plan}
        responseCount={overview.responseCount}
        options={overview.options}
        onFinished={refresh}
      />
    );
  }

  if (!bundle) return <LoadingScreen />;

  return <Dashboard bundle={bundle} myParticipantId={overview.myParticipantId} onChanged={refresh} />;
}
