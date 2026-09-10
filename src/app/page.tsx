"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { MatchBadge } from "@/components/dashboard/match-badge";
import { getDestinationImage } from "@/lib/images";
import { formatILS } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/context";

const PREVIEW_NAMES = ["Ido", "Daniel", "Maya", "Ron", "Tom", "Dana", "Noa", "Ben"];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="px-5 py-5 flex items-center max-w-md mx-auto w-full">
        <span className="text-xl font-extrabold tracking-tight text-foreground">
          {t("landing.wordmark")}
        </span>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="px-5 pt-2 pb-8">
          <div className="max-w-md mx-auto flex flex-col gap-4">
            <span className="text-sm font-semibold text-primary">{t("landing.eyebrow")}</span>

            <h1 className="text-[2.15rem] leading-[1.08] font-extrabold tracking-tight text-balance">
              {t("landing.headline")}
            </h1>

            <p className="text-base text-muted-foreground text-balance">{t("landing.sub")}</p>

            <Link
              href="/new"
              className={buttonVariants({
                size: "lg",
                className: "mt-1 w-full sm:w-auto",
              })}
            >
              {t("landing.cta")}
            </Link>
          </div>
        </div>

        <div className="px-5 pb-12">
          <div className="max-w-md mx-auto">
            <PreviewCard />
          </div>
        </div>
      </main>

      <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
}

function PreviewCard() {
  const { t, lang } = useTranslation();
  const image = getDestinationImage("Athens", "Greece");
  return (
    <Link
      href="/new"
      className="block rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_24px_rgba(16,24,40,0.08)] overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={t("landing.previewDestination")} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
        <div className="absolute top-3 start-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-neutral-900">
          {t("landing.previewTripName")}
        </div>
        <div className="absolute bottom-3 start-4 text-white">
          <div className="text-xl font-extrabold leading-tight">{t("landing.previewDestination")}</div>
          <div className="text-xs font-medium opacity-90">{t("landing.previewDates")}</div>
        </div>
        <div className="absolute bottom-3 end-3">
          <MatchBadge percent={92} size="sm" className="ring-2 ring-white/70" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center -space-x-2 rtl:space-x-reverse">
            {PREVIEW_NAMES.slice(0, 4).map((n) => (
              <AvatarInitials key={n} name={n} size="sm" />
            ))}
            <div className="size-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              +4
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground">{t("landing.previewCanMakeIt")}</span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-sky px-3.5 py-2.5">
          <span className="text-xs font-semibold text-blue-deep">{t("landing.previewEstimatedCost")}</span>
          <span className="text-sm font-extrabold text-blue-deep">
            {formatILS(1490, lang)} {t("options.perPerson")}
          </span>
        </div>
      </div>
    </Link>
  );
}
