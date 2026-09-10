"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getFullPlanBundle, getPlanOverview, type PlanOverview } from "@/lib/store";
import type { PlanBundle } from "@/lib/types";

const REALTIME_TABLES = ["plans", "participants", "availabilities", "preferences", "trip_options", "votes"] as const;

export interface UseTripResult {
  loading: boolean;
  notFound: boolean;
  /** Plan + options + response count — resolvable for anyone with the link. */
  overview: PlanOverview | null;
  /** Full group data — only populated once the current user is a member. */
  bundle: PlanBundle | null;
  /** The signed-in user's participant id for this plan, once known. */
  myParticipantId: string | null;
  refresh: () => void;
}

export function useTrip(shareCode: string): UseTripResult {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [overview, setOverview] = useState<PlanOverview | null>(null);
  const [bundle, setBundle] = useState<PlanBundle | null>(null);
  const refreshTick = useRef(0);

  const load = useCallback(async () => {
    const myTick = ++refreshTick.current;
    setLoading(true);
    try {
      const ov = await getPlanOverview(shareCode);
      if (refreshTick.current !== myTick) return;

      if (!ov) {
        setOverview(null);
        setBundle(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOverview(ov);
      setNotFound(false);

      if (ov.isMember) {
        const full = await getFullPlanBundle(ov.plan.id);
        if (refreshTick.current !== myTick) return;
        setBundle(full);
      } else {
        setBundle(null);
      }
    } finally {
      if (refreshTick.current === myTick) setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Realtime: once we're a member, stay in sync with the rest of the group
  // without polling or a manual refresh.
  useEffect(() => {
    const planId = overview?.isMember ? overview.plan.id : null;
    if (!planId) return;

    const channel = supabase.channel(`plan:${planId}`);
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: table === "plans" ? `id=eq.${planId}` : `plan_id=eq.${planId}` },
        () => load()
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [overview?.isMember, overview?.plan.id, load]);

  return {
    loading,
    notFound,
    overview,
    bundle,
    myParticipantId: overview?.myParticipantId ?? null,
    refresh: load,
  };
}
