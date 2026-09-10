import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/format";

export function AvatarInitials({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "size-7 text-xs",
    md: "size-9 text-sm",
    lg: "size-12 text-base",
  }[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold shrink-0 border-2 border-background",
        sizeClasses,
        avatarColor(name),
        className
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
