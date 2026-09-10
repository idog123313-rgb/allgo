import { cn } from "@/lib/utils";

/** Allgo's signature "group match" indicator — a ring badge, used everywhere a % appears. */
export function MatchBadge({
  percent,
  size = "md",
  className,
}: {
  percent: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: { box: 40, ring: 3, text: "text-[11px]" },
    md: { box: 52, ring: 4, text: "text-sm" },
    lg: { box: 72, ring: 5, text: "text-lg" },
  }[size];

  const color = percent >= 80 ? "var(--blue)" : percent >= 50 ? "var(--lilac-deep)" : "var(--blush-deep)";

  return (
    <div
      className={cn("relative shrink-0 rounded-full flex items-center justify-center", className)}
      style={{
        width: dims.box,
        height: dims.box,
        background: `conic-gradient(${color} ${percent * 3.6}deg, var(--muted) 0deg)`,
      }}
    >
      <div
        className="absolute rounded-full bg-card flex items-center justify-center"
        style={{ inset: dims.ring }}
      >
        <span className={cn("font-bold text-foreground", dims.text)}>{percent}%</span>
      </div>
    </div>
  );
}
