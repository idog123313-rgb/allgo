import type { Plan } from "./types";

export function inviteUrl(shareCode: string): string {
  if (typeof window === "undefined") return `/trip/${shareCode}`;
  return `${window.location.origin}/trip/${shareCode}`;
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function inviteMessage(plan: Plan, t: Translate): string {
  return t("whatsapp.invite", { name: plan.name, link: inviteUrl(plan.shareCode) });
}

export function reminderMessage(plan: Plan, t: Translate): string {
  return t("whatsapp.reminder", { name: plan.name, link: inviteUrl(plan.shareCode) });
}

export function askBlockerMessage(plan: Plan, personName: string, t: Translate): string {
  return t("whatsapp.askBlocker", { person: personName, name: plan.name, link: inviteUrl(plan.shareCode) });
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "cancelled" | "copied" | "failed";

/**
 * Native share sheet when available (mobile), copy-to-clipboard otherwise.
 * `text` is expected to already contain the trip link — Web Share API's
 * `url` field is deliberately left out so the link doesn't appear twice.
 */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // fall through to clipboard fallback
    }
  }
  return (await copyToClipboard(text)) ? "copied" : "failed";
}
