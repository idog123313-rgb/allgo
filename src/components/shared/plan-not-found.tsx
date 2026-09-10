"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Compass } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function PlanNotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-24 text-center gap-4">
      <div className="size-14 rounded-full bg-sky flex items-center justify-center">
        <Compass className="size-6 text-blue" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-extrabold">{t("notFound.title")}</h1>
        <p className="text-muted-foreground text-sm max-w-xs">{t("notFound.subtitle")}</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        {t("notFound.goHome")}
      </Link>
    </div>
  );
}
