"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { DayStatus } from "@/lib/types";

const DATE_LOCALES = { en: enUS, he: he };
const WEEKDAY_LABELS: Record<Lang, string[]> = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  he: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
};

const STATUS_STYLES: Record<DayStatus, string> = {
  available: "bg-primary text-primary-foreground",
  maybe: "bg-lilac text-lilac-deep",
  unavailable: "bg-muted text-muted-foreground/50 line-through",
};

const NEXT_STATUS: Record<DayStatus, DayStatus> = {
  available: "maybe",
  maybe: "unavailable",
  unavailable: "available",
};

export interface AvailabilityValue {
  flexible: boolean;
  days: Record<string, DayStatus>;
}

export function countAvailableDays(rangeStart: string, rangeEnd: string, value: AvailabilityValue): number {
  const start = parseISO(rangeStart);
  const end = parseISO(rangeEnd);
  if (value.flexible) return eachDayOfInterval({ start, end }).length;
  return eachDayOfInterval({ start, end }).filter((d) => {
    const status = value.days[format(d, "yyyy-MM-dd")] ?? "available";
    return status === "available";
  }).length;
}

export function AvailabilityCalendar({
  rangeStart,
  rangeEnd,
  value,
  onChange,
}: {
  rangeStart: string;
  rangeEnd: string;
  value: AvailabilityValue;
  onChange: (value: AvailabilityValue) => void;
}) {
  const { t, lang } = useTranslation();
  const start = parseISO(rangeStart);
  const end = parseISO(rangeEnd);

  const months: Date[] = [];
  let cursor = startOfMonth(start);
  while (cursor <= end) {
    months.push(cursor);
    cursor = addDays(endOfMonth(cursor), 1);
  }

  function toggleDay(iso: string) {
    const current = value.days[iso] ?? "available";
    onChange({
      ...value,
      days: { ...value.days, [iso]: NEXT_STATUS[current] },
    });
  }

  function markAll(status: DayStatus) {
    const days: Record<string, DayStatus> = {};
    for (const d of eachDayOfInterval({ start, end })) {
      days[format(d, "yyyy-MM-dd")] = status;
    }
    onChange({ ...value, days });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <button
        type="button"
        onClick={() => onChange({ ...value, flexible: !value.flexible })}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-colors",
          value.flexible ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
        )}
      >
        <div>
          <div className="font-semibold text-sm">{t("joinAvailability.flexibleLabel")}</div>
          <div className={cn("text-xs", value.flexible ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {t("joinAvailability.flexibleHint")}
          </div>
        </div>
        <div
          className={cn(
            "size-5 rounded-full border-2 flex items-center justify-center shrink-0",
            value.flexible ? "border-white bg-white" : "border-muted-foreground/30"
          )}
        >
          {value.flexible && <div className="size-2 rounded-full bg-primary" />}
        </div>
      </button>

      {!value.flexible && (
        <>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <Legend color="bg-primary" label={t("joinAvailability.legendAvailable")} />
              <Legend color="bg-lilac" label={t("joinAvailability.legendMaybe")} />
              <Legend color="bg-muted" label={t("joinAvailability.legendCant")} />
            </div>
            <button type="button" onClick={() => markAll("available")} className="text-primary font-semibold hover:underline">
              {t("joinAvailability.resetAll")}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {months.map((month) => (
              <MonthGrid
                key={month.toISOString()}
                month={month}
                rangeStart={start}
                rangeEnd={end}
                days={value.days}
                onToggle={toggleDay}
                lang={lang}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">{t("joinAvailability.tapHint")}</p>
        </>
      )}
    </div>
  );
}

function MonthGrid({
  month,
  rangeStart,
  rangeEnd,
  days,
  onToggle,
  lang,
}: {
  month: Date;
  rangeStart: Date;
  rangeEnd: Date;
  days: Record<string, DayStatus>;
  onToggle: (iso: string) => void;
  lang: Lang;
}) {
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const locale = DATE_LOCALES[lang];

  return (
    <div>
      <div className="text-sm font-bold mb-2">{format(month, "MMMM yyyy", { locale })}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS[lang].map((w, i) => (
          <div key={i} className="text-center text-[11px] text-muted-foreground font-semibold">
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const iso = format(cell, "yyyy-MM-dd");
          const inMonth = isSameMonth(cell, month);
          const inRange = isWithinInterval(cell, { start: rangeStart, end: rangeEnd });
          const status = days[iso] ?? "available";

          if (!inMonth || !inRange) {
            return (
              <div key={iso} className="aspect-square rounded-lg text-xs flex items-center justify-center text-muted-foreground/20">
                {format(cell, "d")}
              </div>
            );
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onToggle(iso)}
              className={cn(
                "aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all active:scale-90",
                STATUS_STYLES[status]
              )}
            >
              {format(cell, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("size-2.5 rounded-full", color)} />
      <span className="text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
