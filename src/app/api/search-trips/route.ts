import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTravelProvider } from "@/lib/travel";
import { runTripSearch } from "@/lib/travel/search-orchestrator";
import { mapAvailability, mapParticipant, mapPlan, mapPreference, mapTripOption } from "@/lib/db-mappers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { shareCode, participantId } = await request.json();
    if (!shareCode || !participantId) {
      return NextResponse.json({ error: "shareCode and participantId are required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient(token);

    const { data: planRow, error: planErr } = await supabase.from("plans").select().eq("share_code", shareCode).maybeSingle();
    if (planErr) return NextResponse.json({ error: planErr.message }, { status: 400 });
    if (!planRow) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    const plan = mapPlan(planRow);

    const [participantsRes, availabilitiesRes, preferencesRes, optionsRes] = await Promise.all([
      supabase.from("participants").select().eq("plan_id", plan.id),
      supabase.from("availabilities").select().eq("plan_id", plan.id),
      supabase.from("preferences").select().eq("plan_id", plan.id),
      supabase.from("trip_options").select().eq("plan_id", plan.id),
    ]);
    for (const res of [participantsRes, availabilitiesRes, preferencesRes, optionsRes]) {
      if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });
    }

    const participants = (participantsRes.data ?? []).map(mapParticipant);
    const availabilities = (availabilitiesRes.data ?? []).map(mapAvailability);
    const preferences = (preferencesRes.data ?? []).map(mapPreference);
    const existingOptions = (optionsRes.data ?? []).map(mapTripOption);

    const provider = createTravelProvider();
    const candidates = await runTripSearch(provider, plan, participants, availabilities, preferences, existingOptions);

    if (candidates.length === 0) {
      return NextResponse.json({ options: [] });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("trip_options")
      .insert(
        candidates.map((c) => ({
          plan_id: plan.id,
          name: c.name,
          destination: c.destination,
          image_emoji: c.imageEmoji,
          date_start: c.dateStart,
          date_end: c.dateEnd,
          flight_estimate: c.flightEstimate,
          hotel_estimate: c.hotelEstimate,
          other_estimate: 0,
          external_link: null,
          notes: null,
          trip_types: c.tripTypes,
          provider: provider.id,
          price_type: provider.priceType,
          currency: "ILS",
          searched_at: new Date().toISOString(),
          created_by: participantId,
        }))
      )
      .select();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

    return NextResponse.json({ options: inserted });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 500 });
  }
}
