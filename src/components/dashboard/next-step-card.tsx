"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Allgo's single "here's what's going on, here's what to do" note. One
 * message, one button — never a grid of competing insights.
 */
export function NextStepCard({
  lead,
  detail,
  buttonLabel,
  onButtonClick,
}: {
  lead: string;
  detail?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-sky border border-transparent p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="size-7 rounded-full bg-white/70 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="size-3.5 text-blue" />
        </div>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <p className="text-sm font-bold text-blue-deep leading-snug">{lead}</p>
          {detail && <p className="text-sm text-blue-deep/80 leading-snug">{detail}</p>}
        </div>
      </div>
      {buttonLabel && onButtonClick && (
        <Button size="sm" className="self-start" onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
