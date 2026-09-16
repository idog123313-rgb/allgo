"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { createPlan } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";

const NIGHT_OPTIONS = [2, 3, 4, 5, 7];
// The "possible date range" is a search window, not the trip itself — cap it
// so a mis-tapped native date picker can't silently balloon it to months.
const MAX_RANGE_DAYS = 120;

export default function NewTripPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const today = new Date();

  const [name, setName] = useState("");
  const [destinationIdea, setDestinationIdea] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState(format(addDays(today, 14), "yyyy-MM-dd"));
  const [dateRangeEnd, setDateRangeEnd] = useState(format(addDays(today, 44), "yyyy-MM-dd"));
  const [tripLengthNights, setTripLengthNights] = useState(3);
  const [tripLengthFlexible, setTripLengthFlexible] = useState(false);
  const [departureLocation, setDepartureLocation] = useState("");
  const [roomOccupancy, setRoomOccupancy] = useState(2);
  const [customRoomOccupancy, setCustomRoomOccupancy] = useState(false);
  const [organizerName, setOrganizerName] = useState("");
  const [expectedNames, setExpectedNames] = useState<string[]>([]);
  const [nameDraft, setNameDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && organizerName.trim().length > 0 && !submitting;
  const maxDateRangeEnd = format(addDays(parseISO(dateRangeStart), MAX_RANGE_DAYS), "yyyy-MM-dd");

  function handleDateRangeStartChange(value: string) {
    setDateRangeStart(value);
    const maxEnd = format(addDays(parseISO(value), MAX_RANGE_DAYS), "yyyy-MM-dd");
    if (dateRangeEnd < value) setDateRangeEnd(value);
    else if (dateRangeEnd > maxEnd) setDateRangeEnd(maxEnd);
  }

  function handleDateRangeEndChange(value: string) {
    setDateRangeEnd(value > maxDateRangeEnd ? maxDateRangeEnd : value);
  }

  function addExpectedName() {
    const trimmed = nameDraft.trim();
    if (trimmed && !expectedNames.includes(trimmed)) {
      setExpectedNames([...expectedNames, trimmed]);
    }
    setNameDraft("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const plan = await createPlan({
        name: name.trim(),
        destinationIdea,
        dateRangeStart,
        dateRangeEnd,
        tripLengthNights,
        tripLengthFlexible,
        departureLocation,
        roomOccupancy,
        organizerName: organizerName.trim(),
        expectedParticipantNames: expectedNames,
      });
      router.push(`/trip/${plan.shareCode}/invite`);
    } catch {
      toast.error(t("common.toastFailed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 py-4 max-w-lg mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("create.back")}
        </Link>
      </header>

      <main className="flex-1 px-5 pb-16">
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold leading-tight">{t("create.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("create.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Card className="p-4 gap-4">
              <Field label={t("create.tripName")} required>
                <Input
                  placeholder={t("create.tripNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                />
              </Field>

              <Field label={t("create.destinationIdea")} hint={t("common.optional")}>
                <Input
                  placeholder={t("create.destinationPlaceholder")}
                  value={destinationIdea}
                  onChange={(e) => setDestinationIdea(e.target.value)}
                  maxLength={60}
                />
              </Field>

              <Field label={t("create.dateRange")}>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => handleDateRangeStartChange(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <span className="text-muted-foreground text-sm">{t("create.to")}</span>
                  <Input
                    type="date"
                    value={dateRangeEnd}
                    min={dateRangeStart}
                    max={maxDateRangeEnd}
                    onChange={(e) => handleDateRangeEndChange(e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("create.dateRangeHint")}</p>
              </Field>

              <Field label={t("create.tripLength")}>
                <div className="flex flex-wrap gap-2">
                  {NIGHT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setTripLengthNights(n);
                        setTripLengthFlexible(false);
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition-all active:scale-95 ${
                        !tripLengthFlexible && tripLengthNights === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {n} {t("create.nights")}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTripLengthFlexible(true)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition-all active:scale-95 ${
                      tripLengthFlexible
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t("create.flexibleLength")}
                  </button>
                </div>
              </Field>

              <Field label={t("create.departureLocation")}>
                <Input
                  placeholder={t("create.departurePlaceholder")}
                  value={departureLocation}
                  onChange={(e) => setDepartureLocation(e.target.value)}
                  maxLength={40}
                />
              </Field>

              <Field label={t("create.roomSetup")} hint={t("create.roomSetupHint")}>
                <div className="flex flex-wrap items-center gap-2">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setRoomOccupancy(n);
                        setCustomRoomOccupancy(false);
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition-all active:scale-95 ${
                        !customRoomOccupancy && roomOccupancy === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t("create.perRoom", { count: n })}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomRoomOccupancy(true)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition-all active:scale-95 ${
                      customRoomOccupancy
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t("create.custom")}
                  </button>
                  {customRoomOccupancy && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10}
                      value={roomOccupancy}
                      onChange={(e) => setRoomOccupancy(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                      className="w-20"
                    />
                  )}
                </div>
              </Field>

              <Field label={t("create.yourName")}>
                <Input
                  placeholder={t("create.organizerPlaceholder")}
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  maxLength={40}
                  required
                />
              </Field>
            </Card>

            <Card className="p-4 gap-3">
              <Field label={t("create.inviting")} hint={t("create.invitingHint")}>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("create.namePlaceholder")}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addExpectedName();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addExpectedName}>
                    {t("create.add")}
                  </Button>
                </div>
              </Field>
              {expectedNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {expectedNames.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-sky px-3 py-1 text-sm font-medium text-blue-deep"
                    >
                      {n}
                      <button
                        type="button"
                        onClick={() => setExpectedNames(expectedNames.filter((x) => x !== n))}
                        className="text-blue-deep/50 hover:text-blue-deep"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <Button type="submit" size="lg" disabled={!canSubmit} className="text-base">
              {submitting ? t("create.creating") : t("create.createTrip")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-primary">*</span>}
        {hint && <span className="text-muted-foreground font-normal"> ({hint})</span>}
      </Label>
      {children}
    </div>
  );
}
