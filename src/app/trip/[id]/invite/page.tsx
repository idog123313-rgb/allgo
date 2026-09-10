"use client";

import { use } from "react";
import { useTrip } from "@/hooks/use-plan";
import { InviteReady } from "@/components/invite/invite-ready";
import { PlanNotFound } from "@/components/shared/plan-not-found";
import { LoadingScreen } from "@/components/shared/loading-screen";

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { overview, loading, notFound } = useTrip(id);

  if (loading) return <LoadingScreen />;
  if (notFound || !overview) return <PlanNotFound />;

  return <InviteReady plan={overview.plan} />;
}
