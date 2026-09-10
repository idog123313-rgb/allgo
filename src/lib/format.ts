import { format, parseISO } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { Lang } from "./i18n/dictionaries";

const DATE_LOCALES = { en: enUS, he: he };

export function formatILS(amount: number, lang: Lang = "en"): string {
  const locale = lang === "he" ? "he-IL" : "en-US";
  return `₪${Math.round(amount).toLocaleString(locale)}`;
}

// Wraps text that must stay left-to-right (dates, ranges, ratios — anything
// with two-plus digit groups joined by a dash/slash) even when embedded
// inside a right-to-left paragraph. Without these Unicode isolate marks, the
// bidi algorithm can visually reverse "15–18" to "18–15", or "8/9" to "9/8".
const LRI = "⁦";
const PDI = "⁩";
export function ltrIsolate(text: string, lang: Lang): string {
  return lang === "he" ? `${LRI}${text}${PDI}` : text;
}

export function formatRatio(a: number | string, b: number | string, lang: Lang = "en"): string {
  return ltrIsolate(`${a}/${b}`, lang);
}

export function formatDateShort(iso: string, lang: Lang = "en"): string {
  return ltrIsolate(format(parseISO(iso), "MMM d", { locale: DATE_LOCALES[lang] }), lang);
}

export function formatDateRange(startIso: string, endIso: string, lang: Lang = "en"): string {
  const locale = DATE_LOCALES[lang];
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const startMonth = format(start, "MMM", { locale });
  const endMonth = format(end, "MMM", { locale });
  const sameMonth = startMonth === endMonth;

  if (lang !== "he") {
    return sameMonth
      ? `${format(start, "MMM d", { locale })}–${format(end, "d", { locale })}`
      : `${format(start, "MMM d", { locale })} – ${format(end, "MMM d", { locale })}`;
  }

  // Hebrew: isolate only the pure-digit day range. A Hebrew month name mixed
  // *inside* the same isolate as a "23–26" run still gets its digit order
  // flipped by the bidi algorithm — the isolate has to contain digits only.
  const startDay = format(start, "d", { locale });
  const endDay = format(end, "d", { locale });
  return sameMonth
    ? `${startMonth} ${ltrIsolate(`${startDay}–${endDay}`, lang)}`
    : `${startMonth} ${ltrIsolate(startDay, lang)} – ${endMonth} ${ltrIsolate(endDay, lang)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue text-white",
  "bg-lilac text-lilac-deep",
  "bg-blush text-blush-deep",
  "bg-ink text-white",
  "bg-sky text-blue-deep",
  "bg-lilac-deep text-white",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hashSeed(seed) % AVATAR_COLORS.length];
}
