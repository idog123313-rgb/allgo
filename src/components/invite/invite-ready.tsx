"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Copy, MessageCircle, PartyPopper, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Plan } from "@/lib/types";
import { copyToClipboard, inviteMessage, inviteUrl, shareText, whatsappHref } from "@/lib/whatsapp";
import { useTranslation } from "@/lib/i18n/context";

export function InviteReady({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const link = inviteUrl(plan.shareCode);
  const message = inviteMessage(plan, t);

  async function handleShare() {
    const result = await shareText(plan.name, message);
    if (result === "copied") toast.success(t("invite.toastMessageCopied"));
    if (result === "failed") toast.error(t("invite.toastShareFailed"));
  }

  async function handleCopyLink() {
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopiedLink(true);
      toast.success(t("invite.toastLinkCopied"));
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  async function handleCopyMessage() {
    const ok = await copyToClipboard(message);
    if (ok) {
      setCopiedMessage(true);
      toast.success(t("invite.toastMessageCopied"));
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <div className="max-w-md w-full flex flex-col items-center gap-5 text-center">
        <div className="size-14 rounded-full bg-sky flex items-center justify-center text-blue">
          <PartyPopper className="size-7" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold leading-tight">{t("invite.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("invite.subtitle")}</p>
        </div>

        <Button onClick={handleShare} size="lg" className="w-full gap-1.5">
          <Share2 className="size-4" />
          {t("invite.shareTrip")}
        </Button>

        <Card className="p-4 w-full gap-3">
          <div
            dir="ltr"
            className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-mono break-all text-left"
          >
            {link}
          </div>
          <Button onClick={handleCopyLink} variant="secondary" size="lg" className="w-full">
            {copiedLink ? (
              <>
                <Check className="size-4" /> {t("invite.copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" /> {t("invite.copyLink")}
              </>
            )}
          </Button>
        </Card>

        <Card className="p-4 w-full gap-3 bg-sky border-transparent">
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-left whitespace-pre-line">
            {message}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyMessage} variant="outline" size="lg" className="flex-1">
              {copiedMessage ? (
                <>
                  <Check className="size-4" /> {t("invite.copied")}
                </>
              ) : (
                <>
                  <Copy className="size-4" /> {t("invite.copyMessage")}
                </>
              )}
            </Button>
            <a
              href={whatsappHref(message)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg", className: "flex-1 gap-1.5" })}
            >
              <MessageCircle className="size-4" />
              {t("invite.openWhatsapp")}
            </a>
          </div>
        </Card>

        <Link
          href={`/trip/${plan.shareCode}`}
          className={buttonVariants({ variant: "ghost", className: "text-muted-foreground font-semibold" })}
        >
          {t("invite.openDashboard")}
        </Link>
      </div>
    </div>
  );
}
