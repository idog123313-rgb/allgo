import { useId } from "react";

// Same artwork as src/app/icon.svg — keep the two in sync.
export function LogoMark({ className }: { className?: string }) {
  const gradientId = `logo-bg-${useId().replace(/:/g, "")}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b9bff" />
          <stop offset="0.55" stopColor="#2f6fed" />
          <stop offset="1" stopColor="#7c5cd6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${gradientId})`} />
      <circle cx="392" cy="140" r="36" fill="#ffd166" />
      <path
        d="M128 392 L256 136 L384 392"
        fill="none"
        stroke="#fff"
        strokeWidth="62"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M204 336 Q256 276 308 336"
        fill="none"
        stroke="#ffd166"
        strokeWidth="28"
        strokeLinecap="round"
        strokeDasharray="1 27"
      />
    </svg>
  );
}
