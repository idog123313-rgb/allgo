"use client";

import { Children, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { castVote, getFullPlanBundle, joinPlanByCode, submitAvailability, submitPreference } from "@/lib/store";
import { formatDateRange, formatILS } from "@/lib/format";
import { getDestinationImage, TRIP_TYPE_IMAGES } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/context";
import { computeBestDateWindows, computeOptionMatch, optionTotal } from "@/lib/planning";
import {
  BUDGET_BANDS,
  FLIGHT_PREFERENCE_OPTIONS,
  TRIP_TYPE_OPTIONS,
  type FlightPreference,
  type Plan,
  type TripOption,
  type TripType,
  type VoteValue,
} from "@/lib/types";
import { AvailabilityCalendar, countAvailableDays, type AvailabilityValue } from "./availability-calendar";

type Step = "intro" | "name" | "availability" | "budget" | "preferences" | "reactions" | "success";
const STEP_ORDER: Step[] = ["name", "availability", "budget", "preferences"];

const REACTIONS: { value: VoteValue; emoji: string; labelKey: string }[] = [
  { value: "love", emoji: "❤️", labelKey: "joinReactions.loveIt" },
  { value: "like", emoji: "👍", labelKey: "joinReactions.imIn" },
  { value: "no", emoji: "👎", labelKey: "joinReactions.pass" },
];

export function JoinFlow({
  plan,
  responseCount,
  options,
  onFinished,
}: {
  plan: Plan;
  responseCount: number;
  options: TripOption[];
  onFinished: () => void;
}) {
  const { t, lang } = useTranslation();
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [availability, setAvailability] = useState<AvailabilityValue>({ flexible: false, days: {} });
  const [budget, setBudget] = useState(1750);
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [flightPreference, setFlightPreference] = useState<FlightPreference>("balanced");
  const [submitting, setSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [reactionIndex, setReactionIndex] = useState(0);
  const [finalCount, setFinalCount] = useState(responseCount);
  const [highlight, setHighlight] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  function goNext() {
    const next = STEP_ORDER[stepIndex + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = STEP_ORDER[stepIndex - 1];
    if (prev) setStep(prev);
    else setStep("intro");
  }

  async function finishUp(pid: string) {
    const bundle = await getFullPlanBundle(plan.id);
    if (bundle) {
      const responded = bundle.participants.filter((p) => p.respondedAt);
      setFinalCount(responded.length);
      setHighlight(computeHighlight(bundle, pid, t, lang));
    }
    setStep("success");
  }

  async function handleSubmitPreferences() {
    setSubmitting(true);
    try {
      const { participantId: pid } = await joinPlanByCode(plan.shareCode, name);
      await submitAvailability(plan.id, pid, availability);
      await submitPreference(plan.id, pid, { budgetPerPerson: budget, tripTypes, flightPreference });
      setParticipantId(pid);
      if (options.length > 0) {
        setReactionIndex(0);
        setStep("reactions");
      } else {
        await finishUp(pid);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReact(value: VoteValue) {
    if (!participantId) return;
    await castVote(plan.id, options[reactionIndex].id, participantId, value);
    if (reactionIndex + 1 < options.length) {
      setReactionIndex(reactionIndex + 1);
    } else {
      await finishUp(participantId);
    }
  }

  if (step === "intro") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center gap-5">
        <span className="text-6xl">🌴</span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold">{t("joinIntro.title")}</h1>
          <p className="text-lg font-bold">{plan.name}</p>
          <p className="text-muted-foreground">
            {responseCount > 0 ? t("joinIntro.subtitle", { count: responseCount }) : t("joinIntro.subtitleEmpty")}
          </p>
        </div>
        <Button size="lg" className="px-8" onClick={() => setStep("name")}>
          {t("joinIntro.cta")}
        </Button>
      </div>
    );
  }

  if (step === "reactions") {
    const option = options[reactionIndex];
    const image = getDestinationImage(option.name, option.destination);
    return (
      <div className="flex-1 flex flex-col">
        <header className="px-5 py-4 max-w-lg mx-auto w-full flex items-center justify-between">
          <span className="text-sm font-bold">{t("joinReactions.title")}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {reactionIndex + 1} / {options.length}
          </span>
        </header>
        <main className="flex-1 px-5 pb-8 flex flex-col">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col gap-5">
            <p className="text-sm text-muted-foreground -mt-2">{t("joinReactions.subtitle")}</p>
            <div className="relative h-64 rounded-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={option.destination} className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/5" />
              <div className="absolute bottom-4 start-5 text-white">
                <div className="text-2xl font-extrabold leading-tight">{option.name}</div>
                {option.dateStart && option.dateEnd && (
                  <div className="text-sm font-medium opacity-90">
                    {formatDateRange(option.dateStart, option.dateEnd, lang)}
                  </div>
                )}
                <div className="text-sm font-bold opacity-95 mt-0.5">
                  ~{formatILS(optionTotal(option), lang)} {t("options.perPerson")}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="grid grid-cols-3 gap-2.5">
              {REACTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleReact(r.value)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card py-4 transition-all active:scale-95 hover:border-primary/40"
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-xs font-semibold">{t(r.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center gap-5">
        <span className="text-6xl">🎉</span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold">{t("joinSuccess.title")}</h1>
          <p className="text-muted-foreground">{t("joinSuccess.count", { count: finalCount })}</p>
        </div>
        {highlight && (
          <p className="text-sm font-semibold text-blue-deep bg-sky rounded-full px-4 py-2">{highlight}</p>
        )}
        <Button size="lg" className="px-8" onClick={onFinished}>
          {t("joinSuccess.viewPlan")}
        </Button>
      </div>
    );
  }

  const availableCount = countAvailableDays(plan.dateRangeStart, plan.dateRangeEnd, availability);

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 py-4 max-w-lg mx-auto w-full flex items-center gap-3">
        <button onClick={goBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="flex-1 flex gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i <= stepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 pb-8 flex flex-col">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          {step === "name" && (
            <StepShell title={plan.name} subtitle={t("joinName.subtitle")}>
              <div className="flex flex-col gap-4">
                <Input
                  autoFocus
                  placeholder={t("joinName.placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="h-14 text-lg rounded-2xl px-5"
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && goNext()}
                />
              </div>
              <FooterButton disabled={!name.trim()} onClick={goNext}>
                {t("common.continue")}
              </FooterButton>
            </StepShell>
          )}

          {step === "availability" && (
            <StepShell title={t("joinAvailability.title")} subtitle={t("joinAvailability.subtitle")}>
              <AvailabilityCalendar
                rangeStart={plan.dateRangeStart}
                rangeEnd={plan.dateRangeEnd}
                value={availability}
                onChange={setAvailability}
              />
              <div className="flex items-center gap-2 rounded-xl bg-sky px-4 py-3 mt-4 text-sm font-semibold text-blue-deep">
                <Sparkles className="size-4 shrink-0" />
                {t("joinAvailability.nice", { count: availableCount })}
              </div>
              <FooterButton onClick={goNext}>{t("common.continue")}</FooterButton>
            </StepShell>
          )}

          {step === "budget" && (
            <StepShell title={t("joinBudget.title")} subtitle={t("joinBudget.subtitle")}>
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl bg-sky p-5 flex flex-col items-center gap-3 text-center">
                  <span className="text-xs font-bold tracking-wide uppercase text-blue-deep/60">
                    {t("joinBudget.yourBudget")}
                  </span>
                  <span className="text-5xl font-extrabold text-blue-deep">{formatILS(budget, lang)}</span>
                  <span className="text-xs text-blue-deep/60">{t("joinBudget.perPerson")}</span>
                  <Slider
                    min={200}
                    max={6000}
                    step={50}
                    value={[budget]}
                    onValueChange={(v) => setBudget(Array.isArray(v) ? v[0] : v)}
                    className="w-full mt-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {BUDGET_BANDS.map((band) => {
                    const rep = band.max ? Math.round((band.min + band.max) / 2) : band.min + 500;
                    const selected = budget === rep;
                    return (
                      <button
                        key={band.key}
                        type="button"
                        onClick={() => setBudget(rep)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {t(`budgetBand.${band.key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <FooterButton onClick={goNext}>{t("common.continue")}</FooterButton>
            </StepShell>
          )}

          {step === "preferences" && (
            <StepShell title={t("joinPreferences.title")} subtitle={t("joinPreferences.subtitle")}>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-2.5">
                  {TRIP_TYPE_OPTIONS.map((opt) => {
                    const selected = tripTypes.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setTripTypes(
                            selected
                              ? tripTypes.filter((tt) => tt !== opt.value)
                              : [...tripTypes, opt.value]
                          )
                        }
                        className={cn(
                          "relative h-24 rounded-2xl overflow-hidden text-start transition-all active:scale-[0.97]",
                          selected && "ring-3 ring-primary ring-offset-2 ring-offset-background"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={TRIP_TYPE_IMAGES[opt.value]}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                        <span className="absolute bottom-2 start-2.5 text-sm font-bold text-white flex items-center gap-1">
                          {opt.emoji} {t(`tripType.${opt.value}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="text-sm font-semibold text-foreground">{t("joinPreferences.flightPreference")}</div>
                  <div className="flex flex-col gap-2">
                    {FLIGHT_PREFERENCE_OPTIONS.map((opt) => {
                      const selected = flightPreference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFlightPreference(opt.value)}
                          className={cn(
                            "rounded-xl border px-4 py-3 text-start transition-all active:scale-[0.99]",
                            selected ? "border-primary bg-sky" : "border-border bg-card hover:border-primary/30"
                          )}
                        >
                          <div className="text-sm font-semibold">{t(`flightPreference.${opt.value}_label`)}</div>
                          <div className="text-xs text-muted-foreground">{t(`flightPreference.${opt.value}_hint`)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <FooterButton onClick={handleSubmitPreferences} disabled={submitting}>
                {submitting ? t("joinPreferences.submitting") : t("joinPreferences.submit")}
              </FooterButton>
            </StepShell>
          )}
        </div>
      </main>
    </div>
  );
}

function computeHighlight(
  bundle: Awaited<ReturnType<typeof getFullPlanBundle>>,
  myParticipantId: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
  lang: "en" | "he"
): string | null {
  if (!bundle) return null;
  const { plan, participants, availabilities, preferences, options, votes } = bundle;

  const myVotes = votes.filter((v) => v.participantId === myParticipantId);
  for (const v of myVotes) {
    if (v.value !== "love") continue;
    const optionVotes = votes.filter((ov) => ov.optionId === v.optionId);
    if (optionVotes.length === 1) {
      const option = options.find((o) => o.id === v.optionId);
      if (option) return t("joinSuccess.highlightFirstVote", { name: option.name });
    }
  }

  const bestDates = computeBestDateWindows(plan, participants, availabilities, 1);
  const top = bestDates[0];
  if (top && top.availableCount === top.total && top.total > 1) {
    return t("joinSuccess.highlightAllDatesWork", { dates: formatDateRange(top.startIso, top.endIso, lang) });
  }

  if (options.length > 0) {
    const matches = options.map((option) => ({
      option,
      match: computeOptionMatch(option, participants, availabilities, preferences, votes),
    }));
    matches.sort((a, b) => b.match.matchPercent - a.match.matchPercent);
    if (matches[0].match.totalVotes > 0) {
      return t("joinSuccess.highlightWinning", { name: matches[0].option.name });
    }
  }

  return t("joinSuccess.highlightDefault");
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const items = Children.toArray(children);
  const footer = items[items.length - 1];
  const content = items.slice(0, -1);
  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-balance">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex-1">{content}</div>
      {footer}
    </div>
  );
}

function FooterButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button size="lg" onClick={onClick} disabled={disabled} className="text-base w-full mt-5">
      {children}
      <ArrowRight className="size-4 rtl:rotate-180" />
    </Button>
  );
}
