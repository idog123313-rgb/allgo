import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type {
  Availability,
  DayStatus,
  Participant,
  Plan,
  Preference,
  TripOption,
  Vote,
} from "./types";

/** A participant's default day status is "available" — marking days is opt-out, not opt-in. */
export function dayStatusFor(availability: Availability | undefined, iso: string): DayStatus {
  if (!availability) return "available";
  if (availability.flexible) return "available";
  return availability.days[iso] ?? "available";
}

export function statusForRange(
  availability: Availability | undefined,
  startIso: string,
  days: number
): "available" | "maybe" | "unavailable" {
  let worst: "available" | "maybe" | "unavailable" = "available";
  const start = parseISO(startIso);
  for (let i = 0; i < days; i++) {
    const iso = format(addDays(start, i), "yyyy-MM-dd");
    const status = dayStatusFor(availability, iso);
    if (status === "unavailable") return "unavailable";
    if (status === "maybe") worst = "maybe";
  }
  return worst;
}

export interface DateWindowScore {
  startIso: string;
  endIso: string;
  days: number;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  total: number;
  score: number;
}

export function computeBestDateWindows(
  plan: Plan,
  participants: Participant[],
  availabilities: Availability[],
  limit = 3
): DateWindowScore[] {
  const days = plan.tripLengthNights + 1;
  const rangeStart = parseISO(plan.dateRangeStart);
  const rangeEnd = parseISO(plan.dateRangeEnd);
  const totalRangeDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
  const lastStartOffset = totalRangeDays - days;
  if (lastStartOffset < 0 || participants.length === 0) return [];

  const byParticipant = new Map(availabilities.map((a) => [a.participantId, a]));

  const windows: DateWindowScore[] = [];
  for (let offset = 0; offset <= lastStartOffset; offset++) {
    const startIso = format(addDays(rangeStart, offset), "yyyy-MM-dd");
    const endIso = format(addDays(rangeStart, offset + days - 1), "yyyy-MM-dd");

    let availableCount = 0;
    let maybeCount = 0;
    let unavailableCount = 0;

    for (const p of participants) {
      const status = statusForRange(byParticipant.get(p.id), startIso, days);
      if (status === "available") availableCount++;
      else if (status === "maybe") maybeCount++;
      else unavailableCount++;
    }

    windows.push({
      startIso,
      endIso,
      days,
      availableCount,
      maybeCount,
      unavailableCount,
      total: participants.length,
      score: availableCount + maybeCount * 0.5,
    });
  }

  windows.sort((a, b) => b.score - a.score || a.startIso.localeCompare(b.startIso));

  // Greedily pick non-overlapping top windows so results aren't near-duplicates
  // shifted by a day.
  const picked: DateWindowScore[] = [];
  for (const w of windows) {
    const overlaps = picked.some(
      (p) => !(w.endIso < p.startIso || w.startIso > p.endIso)
    );
    if (!overlaps) picked.push(w);
    if (picked.length >= limit) break;
  }
  return picked;
}

export interface BudgetStats {
  count: number;
  median: number;
  min: number;
  max: number;
  bandCounts: { key: string; count: number }[];
}

const BAND_DEFS = [
  { key: "under1000", min: 0, max: 1000 },
  { key: "1000to1500", min: 1000, max: 1500 },
  { key: "1500to2000", min: 1500, max: 2000 },
  { key: "2000to2500", min: 2000, max: 2500 },
  { key: "2500to3500", min: 2500, max: 3500 },
  { key: "over3500", min: 3500, max: Infinity },
];

export function computeBudgetStats(preferences: Preference[]): BudgetStats | null {
  if (preferences.length === 0) return null;
  const values = preferences.map((p) => p.budgetPerPerson).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? Math.round((values[mid - 1] + values[mid]) / 2) : values[mid];

  const bandCounts = BAND_DEFS.map((band) => ({
    key: band.key,
    count: values.filter((v) => v >= band.min && v < band.max).length,
  }));

  return {
    count: values.length,
    median,
    min: values[0],
    max: values[values.length - 1],
    bandCounts,
  };
}

export function optionTotal(option: TripOption): number {
  return option.flightEstimate + option.hotelEstimate + option.otherEstimate;
}

export interface OptionMatch {
  availabilityFit: number; // 0-1
  availableCount: number;
  budgetFit: number; // 0-1
  budgetFitCount: number;
  preferenceFit: number; // 0-1
  voteScore: number; // 0-1
  loveCount: number;
  likeCount: number;
  noCount: number;
  totalVotes: number;
  matchPercent: number;
  totalParticipants: number;
}

// Simple weighted score. Not meant to be scientifically precise — just enough
// to rank/compare options and to move visibly once people vote.
const MATCH_WEIGHTS = { availability: 0.35, budget: 0.3, preferences: 0.15, votes: 0.2 };

export function computeOptionMatch(
  option: TripOption,
  participants: Participant[],
  availabilities: Availability[],
  preferences: Preference[],
  votes: Vote[]
): OptionMatch {
  const total = participants.length;
  const byParticipant = new Map(availabilities.map((a) => [a.participantId, a]));

  let availableCount = 0;
  if (option.dateStart && option.dateEnd) {
    const days = differenceInCalendarDays(parseISO(option.dateEnd), parseISO(option.dateStart)) + 1;
    for (const p of participants) {
      const status = statusForRange(byParticipant.get(p.id), option.dateStart, days);
      if (status !== "unavailable") availableCount++;
    }
  } else {
    availableCount = total;
  }

  const cost = optionTotal(option);
  const relevantPrefs = preferences.filter((p) => participants.some((x) => x.id === p.participantId));
  const budgetFitCount = relevantPrefs.filter((p) => p.budgetPerPerson >= cost).length;
  const budgetFit = relevantPrefs.length > 0 ? budgetFitCount / relevantPrefs.length : 1;

  // Preference fit: for each participant who picked at least one trip type,
  // how much of their picks overlap this option's tags. Participants with no
  // picks (or options with no tags) don't penalize the score.
  const prefsWithTypes = relevantPrefs.filter((p) => p.tripTypes.length > 0);
  const preferenceFit =
    option.tripTypes.length === 0 || prefsWithTypes.length === 0
      ? 1
      : prefsWithTypes.reduce((sum, p) => {
          const overlap = p.tripTypes.filter((t) => option.tripTypes.includes(t)).length;
          return sum + overlap / p.tripTypes.length;
        }, 0) / prefsWithTypes.length;

  const optionVotes = votes.filter((v) => v.optionId === option.id);
  const loveCount = optionVotes.filter((v) => v.value === "love").length;
  const likeCount = optionVotes.filter((v) => v.value === "like").length;
  const noCount = optionVotes.filter((v) => v.value === "no").length;
  const totalVotes = optionVotes.length;
  const voteScore =
    totalVotes > 0 ? (loveCount * 1 + likeCount * 0.5) / totalVotes : 0.5;

  const availabilityFit = total > 0 ? availableCount / total : 1;

  const matchPercent = Math.round(
    100 *
      (MATCH_WEIGHTS.availability * availabilityFit +
        MATCH_WEIGHTS.budget * budgetFit +
        MATCH_WEIGHTS.preferences * preferenceFit +
        MATCH_WEIGHTS.votes * voteScore)
  );

  return {
    availabilityFit,
    availableCount,
    budgetFit,
    budgetFitCount,
    preferenceFit,
    voteScore,
    loveCount,
    likeCount,
    noCount,
    totalVotes,
    matchPercent,
    totalParticipants: total,
  };
}

export interface BudgetThresholdRow {
  amount: number;
  fitCount: number;
  total: number;
}

/** Turns the raw budget spread into a small set of "at this price, N/total fit" rows. */
export function computeBudgetThresholds(preferences: Preference[]): BudgetThresholdRow[] {
  if (preferences.length === 0) return [];
  const values = preferences.map((p) => p.budgetPerPerson).sort((a, b) => a - b);
  const min = values[0];
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0 ? Math.round((values[mid - 1] + values[mid]) / 2) : values[mid];
  const max = values[values.length - 1];

  const candidates = Array.from(new Set([min, median, Math.round((median + max) / 2), max])).sort(
    (a, b) => a - b
  );

  return candidates.map((amount) => ({
    amount,
    fitCount: values.filter((v) => v >= amount).length,
    total: values.length,
  }));
}

export function computeWaitingFor(plan: Plan, participants: Participant[]): string[] {
  const responded = participants.filter((p) => p.respondedAt);
  const respondedNames = new Set(responded.map((p) => p.name.toLowerCase()));
  return plan.expectedParticipantNames.filter((n) => !respondedNames.has(n.toLowerCase()));
}

export type Blocker =
  | { kind: "dateSingleBlocker"; name: string; startIso: string; endIso: string }
  | { kind: "dateImprovement"; fromCount: number; toCount: number; total: number; startIso: string; endIso: string }
  | { kind: "budgetCeiling"; optionName: string; ceiling: number }
  | { kind: "budgetOverBy"; optionName: string; name: string; delta: number }
  | { kind: "popularButExpensive"; optionName: string; excludedCount: number; total: number }
  | { kind: "readyToDecide"; optionName: string };

/**
 * Explains — in plain terms — what's currently stopping the group from
 * deciding, instead of just showing raw availability/budget/vote numbers.
 * Returns at most a couple of the most relevant insights.
 */
export function computeBlockers(
  plan: Plan,
  participants: Participant[],
  availabilities: Availability[],
  preferences: Preference[],
  options: TripOption[],
  votes: Vote[]
): Blocker[] {
  const total = participants.length;
  if (total === 0) return [];
  const blockers: Blocker[] = [];

  const bestDates = computeBestDateWindows(plan, participants, availabilities, 1);
  const top = bestDates[0];
  if (top && top.availableCount < top.total) {
    const missing = top.total - top.availableCount;
    if (missing === 1) {
      const byParticipant = new Map(availabilities.map((a) => [a.participantId, a]));
      const blocker = participants.find(
        (p) => statusForRange(byParticipant.get(p.id), top.startIso, top.days) !== "available"
      );
      if (blocker) {
        blockers.push({ kind: "dateSingleBlocker", name: blocker.name, startIso: top.startIso, endIso: top.endIso });
      }
    } else {
      const allWindows = computeBestDateWindows(plan, participants, availabilities, 999);
      const better = allWindows.find(
        (w) => w.availableCount > top.availableCount && (w.startIso > top.endIso || w.endIso < top.startIso)
      );
      if (better) {
        blockers.push({
          kind: "dateImprovement",
          fromCount: top.availableCount,
          toCount: better.availableCount,
          total: top.total,
          startIso: better.startIso,
          endIso: better.endIso,
        });
      }
    }
  }

  if (options.length > 0) {
    const matches = options.map((option) => ({
      option,
      match: computeOptionMatch(option, participants, availabilities, preferences, votes),
    }));
    matches.sort((a, b) => b.match.matchPercent - a.match.matchPercent);
    const leading = matches[0];

    if (leading.match.budgetFitCount < total) {
      const relevantPrefs = preferences.filter((p) => participants.some((x) => x.id === p.participantId));
      const excludedCount = total - leading.match.budgetFitCount;
      const cost = optionTotal(leading.option);
      const excludedPref =
        excludedCount === 1 ? relevantPrefs.find((p) => p.budgetPerPerson < cost) : undefined;
      const excludedParticipant =
        excludedPref && participants.find((x) => x.id === excludedPref.participantId);

      if (excludedPref && excludedParticipant) {
        blockers.push({
          kind: "budgetOverBy",
          optionName: leading.option.name,
          name: excludedParticipant.name,
          delta: cost - excludedPref.budgetPerPerson,
        });
      } else {
        const minBudget = relevantPrefs.length > 0 ? Math.min(...relevantPrefs.map((p) => p.budgetPerPerson)) : 0;
        const fitShare = leading.match.budgetFitCount / total;
        if (fitShare >= 0.5 && minBudget > 0) {
          blockers.push({ kind: "budgetCeiling", optionName: leading.option.name, ceiling: minBudget });
        } else {
          blockers.push({ kind: "popularButExpensive", optionName: leading.option.name, excludedCount, total });
        }
      }
    } else if (blockers.length === 0 && leading.match.matchPercent >= 80) {
      blockers.push({ kind: "readyToDecide", optionName: leading.option.name });
    }
  }

  return blockers.slice(0, 3);
}

export interface OptionWithMatch {
  option: TripOption;
  match: OptionMatch;
}

export interface CompareSummary {
  leader: OptionWithMatch;
  follower: OptionWithMatch;
  followerCheaper: boolean;
  followerFitsEveryone: boolean;
}

/**
 * Human-readable tradeoff between the top two options, e.g. "Athens is more
 * popular. Budapest is cheaper and works for everyone." — instead of making
 * people compare two score cards themselves.
 */
export function compareTopOptions(matches: OptionWithMatch[]): CompareSummary | null {
  if (matches.length < 2) return null;
  const byMatch = [...matches].sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  const popularity = (m: OptionWithMatch) => m.match.loveCount * 2 + m.match.likeCount;

  const [a, b] = byMatch;
  const [leader, follower] = popularity(b) > popularity(a) ? [b, a] : [a, b];

  return {
    leader,
    follower,
    followerCheaper: optionTotal(follower.option) < optionTotal(leader.option),
    followerFitsEveryone:
      follower.match.availableCount === follower.match.totalParticipants &&
      follower.match.budgetFitCount === follower.match.totalParticipants,
  };
}

export type PrimaryAction =
  | { kind: "invite" }
  | { kind: "remind"; names: string[] }
  | { kind: "addOptions" }
  | { kind: "vote"; optionId: string }
  | { kind: "askPerson"; name: string }
  | { kind: "seeDates" }
  | { kind: "compareCheaper" }
  | { kind: "compareFinalists" }
  | { kind: "lockTrip"; optionId: string; optionName: string };

/**
 * The single next thing the group should do, in priority order. Only one of
 * these should ever be shown at a time — competing CTAs are exactly the
 * "dashboard" feeling this is meant to replace.
 */
export function computePrimaryAction(
  participants: Participant[],
  waitingFor: string[],
  options: TripOption[],
  matches: OptionWithMatch[],
  votes: Vote[],
  blockers: Blocker[]
): PrimaryAction | null {
  const responded = participants.filter((p) => p.respondedAt);
  if (responded.length === 0) return { kind: "invite" };
  if (waitingFor.length > 0) return { kind: "remind", names: waitingFor };
  if (options.length === 0) return { kind: "addOptions" };

  const sorted = [...matches].sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  const leading = sorted[0];

  const votedIds = new Set(votes.map((v) => v.participantId));
  const notVoted = responded.filter((p) => !votedIds.has(p.id));
  if (notVoted.length > 0 && leading) return { kind: "vote", optionId: leading.option.id };

  const topBlocker = blockers[0];
  if (topBlocker && topBlocker.kind !== "readyToDecide") {
    if (topBlocker.kind === "dateSingleBlocker") return { kind: "askPerson", name: topBlocker.name };
    if (topBlocker.kind === "dateImprovement") return { kind: "seeDates" };
    return { kind: "compareCheaper" };
  }

  if (sorted.length >= 2) {
    const gap = sorted[0].match.matchPercent - sorted[1].match.matchPercent;
    if (gap < 15) return { kind: "compareFinalists" };
  }

  if (leading) return { kind: "lockTrip", optionId: leading.option.id, optionName: leading.option.name };
  return null;
}
