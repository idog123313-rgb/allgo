import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTravelProvider } from "@/lib/travel";
import { mapPlan, mapTripOption } from "@/lib/db-mappers";
import { optionTotal } from "@/lib/planning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { shareCode, optionId } = await request.json();
    if (!shareCode || !optionId) {
      return NextResponse.json({ error: "shareCode and optionId are required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient(token);

    const { data: planRow, error: planErr } = await supabase.from("plans").select().eq("share_code", shareCode).maybeSingle();
    if (planErr) return NextResponse.json({ error: planErr.message }, { status: 400 });
    if (!planRow) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    const plan = mapPlan(planRow);

    const [{ data: optionRow, error: optionErr }, { count: travelers }] = await Promise.all([
      supabase.from("trip_options").select().eq("id", optionId).eq("plan_id", plan.id).maybeSingle(),
      supabase.from("participants").select("id", { count: "exact", head: true }).eq("plan_id", plan.id),
    ]);
    if (optionErr) return NextResponse.json({ error: optionErr.message }, { status: 400 });
    if (!optionRow) return NextResponse.json({ error: "Option not found" }, { status: 404 });
    const option = mapTripOption(optionRow);
    const previousTotal = optionTotal(option);

    if (!option.dateStart || !option.dateEnd) {
      return NextResponse.json({ error: "This option has no dates to check prices for" }, { status: 400 });
    }

    const provider = createTravelProvider();
    const quote = await provider.refreshPrice({
      origin: plan.departureLocation ?? "",
      destination: option.name,
      dateStart: option.dateStart,
      dateEnd: option.dateEnd,
      travelers: Math.max(1, travelers ?? 1),
      roomOccupancy: plan.roomOccupancy,
    });
    if (!quote) {
      return NextResponse.json({ error: "Couldn't check the latest price for this option" }, { status: 422 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("trip_options")
      .update({
        flight_estimate: quote.flightPricePerPerson,
        hotel_estimate: Math.round(quote.totalAccommodationPrice / Math.max(1, travelers ?? 1)),
        provider: provider.id,
        price_type: "live",
        searched_at: new Date().toISOString(),
      })
      .eq("id", optionId)
      .select()
      .single();
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json({ option: updated, previousTotal });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed" }, { status: 500 });
  }
}
