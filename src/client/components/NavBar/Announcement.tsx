import { useState } from "react";
import { getActiveAnnouncements, useQuery } from "wasp/client/operations";
import { X } from "lucide-react";

const DISMISSED_KEY = "dismissed-announcements";

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid = Object.entries(parsed).filter(
      ([_, ts]) => now - (ts as number) < 7 * 24 * 60 * 60 * 1000
    );
    return new Set(valid.map(([id]) => id));
  } catch {
    return new Set();
  }
}

function dismissId(id: string) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[id] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(parsed));
  } catch {}
}

const ANIM_STYLES = `
@keyframes annSlideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
@keyframes annShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes annPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.75; }
}
@keyframes annGradientMove {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes annMarquee {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
`;

export function Announcement() {
  const { data: announcements } = useQuery(getActiveAnnouncements);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedIds);

  const active = announcements?.find((a: any) => !dismissed.has(a.id));
  if (!active) return null;

  const bgFrom = active.bgFrom || "#e6a556";
  const bgTo = active.bgTo || "#bd6500";
  const anim: string = active.animation || "none";

  const handleDismiss = () => {
    dismissId(active.id);
    setDismissed((prev) => new Set([...prev, active.id]));
  };

  // Background style
  const isGradientMove = anim === "gradientMove";
  const bgStyle: React.CSSProperties = isGradientMove
    ? {
        background: `linear-gradient(90deg, ${bgFrom}, ${bgTo}, ${bgFrom}, ${bgTo})`,
        backgroundSize: "300% 100%",
        animation: "annGradientMove 4s ease infinite",
      }
    : { background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgTo} 100%)` };

  // Wrapper animation
  const wrapperAnim: React.CSSProperties = {
    ...bgStyle,
    ...(anim === "slideDown" ? { animation: "annSlideDown 0.5s ease-out" } : {}),
    ...(anim === "pulse" ? { animation: "annPulse 2s ease-in-out infinite" } : {}),
  };

  const textContent = (
    <>
      <span className="hidden lg:inline">{active.title}</span>
      {active.linkText && (
        <>
          <span className="hidden lg:inline text-white/60">|</span>
          <span className="font-semibold">{active.linkText}</span>
        </>
      )}
      <span className="lg:hidden">{active.title}</span>
    </>
  );

  const renderContent = () => {
    if (anim === "marquee") {
      return (
        <div className="overflow-hidden flex-1">
          <div
            className="flex items-center gap-3 whitespace-nowrap"
            style={{ animation: "annMarquee 12s linear infinite" }}
          >
            {textContent}
            <span className="mx-8 text-white/30">***</span>
            {textContent}
          </div>
        </div>
      );
    }

    if (anim === "shimmer") {
      const shimmerWrap = (children: React.ReactNode) => (
        <span
          className="inline-flex items-center gap-3"
          style={{
            background: `linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.5) 40%, #fff 50%, rgba(255,255,255,0.5) 60%, #fff 100%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "annShimmer 3s ease-in-out infinite",
          }}
        >
          {children}
        </span>
      );

      if (active.linkUrl) {
        return (
          <a
            href={active.linkUrl}
            target={active.linkUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="hover:opacity-90 transition-opacity"
          >
            {shimmerWrap(textContent)}
          </a>
        );
      }
      return shimmerWrap(textContent);
    }

    // Default: static or other animations applied to wrapper
    if (active.linkUrl) {
      return (
        <a
          href={active.linkUrl}
          target={active.linkUrl.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          {textContent}
        </a>
      );
    }
    return <div className="flex items-center gap-3">{textContent}</div>;
  };

  return (
    <>
      <style>{ANIM_STYLES}</style>
      <div
        className="relative flex w-full items-center justify-center gap-3 px-4 py-2.5 text-center text-sm font-medium text-white"
        style={wrapperAnim}
      >
        {renderContent()}

        {active.dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
