"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addOption } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { TRIP_TYPE_OPTIONS, type TripType } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMOJIS = ["✈️", "🏝️", "🏛️", "🏔️", "🏙️", "🍷", "🎡", "🏡"];

export function AddOptionDialog({
  planId,
  participantId,
  onAdded,
}: {
  planId: string;
  participantId: string;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [flight, setFlight] = useState("");
  const [hotel, setHotel] = useState("");
  const [other, setOther] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setDestination("");
    setEmoji(EMOJIS[0]);
    setDateStart("");
    setDateEnd("");
    setFlight("");
    setHotel("");
    setOther("");
    setLink("");
    setNotes("");
    setTripTypes([]);
  }

  function toggleTripType(value: TripType) {
    setTripTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const canSubmit = name.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addOption(planId, participantId, {
        name: name.trim(),
        destination: destination.trim(),
        imageEmoji: emoji,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        flightEstimate: Number(flight) || 0,
        hotelEstimate: Number(hotel) || 0,
        otherEstimate: Number(other) || 0,
        externalLink: link.trim() || null,
        notes: notes.trim() || null,
        tripTypes,
      });
      setOpen(false);
      reset();
      onAdded();
    } catch {
      toast.error(t("common.toastFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        {t("options.addOption")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addOptionDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-1.5 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`size-9 rounded-xl flex items-center justify-center text-lg border transition-all active:scale-95 ${
                  emoji === e ? "border-primary bg-sky" : "border-border"
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={t("addOptionDialog.name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("addOptionDialog.namePlaceholder")} />
            </FieldRow>
            <FieldRow label={t("addOptionDialog.destination")}>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t("addOptionDialog.destinationPlaceholder")}
              />
            </FieldRow>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={t("addOptionDialog.startDate")}>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </FieldRow>
            <FieldRow label={t("addOptionDialog.endDate")}>
              <Input type="date" value={dateEnd} min={dateStart} onChange={(e) => setDateEnd(e.target.value)} />
            </FieldRow>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FieldRow label={t("addOptionDialog.flight")}>
              <Input type="number" inputMode="numeric" value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="620" />
            </FieldRow>
            <FieldRow label={t("addOptionDialog.hotel")}>
              <Input type="number" inputMode="numeric" value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="720" />
            </FieldRow>
            <FieldRow label={t("addOptionDialog.other")}>
              <Input type="number" inputMode="numeric" value={other} onChange={(e) => setOther(e.target.value)} placeholder="150" />
            </FieldRow>
          </div>

          <FieldRow label={t("addOptionDialog.link")}>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." dir="ltr" />
          </FieldRow>

          <FieldRow label={t("addOptionDialog.notes")}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("addOptionDialog.notesPlaceholder")} />
          </FieldRow>

          <FieldRow label={t("addOptionDialog.tripVibe")}>
            <div className="flex flex-wrap gap-1.5">
              {TRIP_TYPE_OPTIONS.map((opt) => {
                const selected = tripTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTripType(opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {opt.emoji} {t(`tripType.${opt.value}`)}
                  </button>
                );
              })}
            </div>
          </FieldRow>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {submitting ? t("addOptionDialog.adding") : t("addOptionDialog.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
