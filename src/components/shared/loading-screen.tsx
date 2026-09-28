import { LogoMark } from "./logo-mark";

export function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <LogoMark className="size-14 animate-pulse drop-shadow-md" />
    </div>
  );
}
