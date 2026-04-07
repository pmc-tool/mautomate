import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useBranding } from "../../branding/BrandingContext";
import heroBg from "../../client/static/landing/hero-bg2.png";
import heroBgdark from "../../client/static/landing/hero-bg-dark.png";
import heroGlow from "../../client/static/landing/hero-glow.svg";
import heroGlowdark from "../../client/static/landing/hero-dark-glow.svg";
import growthChart from "../../client/static/landing/growth-chart.svg";
import badgeIcon from "../../client/static/landing/badge-icon.svg";
import arrowIcon from "../../client/static/landing/arrow-icon.svg";
import socialIcon1 from "../../client/static/landing/platforms/social-icon1.png";
import instagramIcon from "../../client/static/landing/platforms/instagram.png";
import linkedinIcon from "../../client/static/landing/platforms/linkedin.png";

export default function Hero() {
  const branding = useBranding();
  const primaryColor = branding.primaryColor || "#bd711d";
  const darkerPrimary = darkenColor(primaryColor, 0.15);
  return (
    <div className="relative w-full overflow-hidden">
      {/* Light mode: Figma background images */}
      <div className="pointer-events-none absolute inset-0 -z-10 dark:hidden" aria-hidden="true">
        <img
          src={heroBg}
          alt=""
          className="absolute left-1/2 top-0 h-[965px] w-full -translate-x-1/2 object-cover"
        />
        <img
          src={heroGlow}
          alt=""
          className="absolute left-[24%] top-[10%] h-[754px] w-[754px] scale-[2.3]"
        />
      </div>

      {/* Dark mode: CSS gradient background (matching old design) */}
      <div className="pointer-events-none absolute inset-0 -z-10 hidden dark:block" aria-hidden="true">
        <img
          src={heroBgdark}
          alt=""
          className="absolute left-1/2 top-0 h-full w-full -translate-x-1/2 object-cover"
        />
        <img
          src={heroGlowdark}
          alt=""
          className="absolute left-[24%] top-[10%] h-[754px] w-[754px] scale-[2.3]"
        />
      </div>
      {/* <div className="pointer-events-none absolute inset-0 -z-10 hidden dark:block" aria-hidden="true">
        <div className="absolute right-0 top-0 w-full transform-gpu overflow-hidden blur-3xl sm:top-0">
          <div
            className="aspect-[1020/880] w-[70rem] flex-none bg-gradient-to-tr from-amber-400 to-purple-300 opacity-10"
            style={{
              clipPath: "polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)",
            }}
          />
        </div>
        <div className="absolute inset-x-0 top-[calc(100%-40rem)] transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-65rem)]">
          <div
            className="relative aspect-[1020/880] w-[90rem] bg-gradient-to-br from-amber-400 to-purple-300 opacity-10"
            style={{
              clipPath: "ellipse(80% 30% at 80% 50%)",
            }}
          />
        </div>
      </div> */}

      <div className="relative mx-auto max-w-7xl px-4 pt-[40px] sm:px-6 sm:pt-[60px] lg:px-8">
        {/* Center content column */}
        <div className="mx-auto flex max-w-[593px] flex-col items-center text-center">
          {/* Pill badge */}
          <div className="mb-[10px] inline-flex items-center gap-[8px] rounded-[160px] bg-white px-[10px] py-[6px] shadow-[0px_4px_8px_0px_rgba(108,77,27,0.12)] sm:px-[12px] sm:py-[8px] dark:border dark:border-border dark:bg-card dark:shadow-none">
            <img src={badgeIcon} alt="" className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] dark:invert" />
            <span className="whitespace-nowrap text-[12px] font-medium leading-[1.6] text-[#0a0f14] sm:text-[14px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Marketing automation platform
            </span>
          </div>

          {/* Main headline */}
          <div className="flex flex-col items-center leading-[1.1] tracking-[-0.92px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            <h1 className="text-[36px] font-bold sm:text-[56px] md:text-[72px] lg:text-[92px]" style={{ color: primaryColor }}>
              {branding.tagline || "Marketing OS"}
            </h1>
            <h1 className="text-[36px] font-bold text-[#0a0f14] sm:text-[56px] md:text-[72px] lg:text-[92px] dark:text-foreground">
              {branding.domain || "mAutomate.ai"}
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mt-[10px] max-w-[481px] px-2 text-center text-[15px] leading-[1.6] text-[#2e2e2e] sm:px-0 sm:text-[18px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            {branding.slogan || "The complete Al Marketing Operating System, not just a tool. Automate Content, Reels, DMs, and Growth in One Platform with a single Al Brain."}
          </p>
        </div>

        {/* Area with floating cards + CTA buttons */}
        <div className="relative mx-auto mt-[30px] flex max-w-[1200px] items-center justify-center sm:mt-[40px]" style={{ minHeight: 120 }}>
          {/* Multi-feed card — LEFT side, rotated */}
          <div className="absolute left-0 top-1/2 hidden -translate-y-1/2 lg:block xl:left-[40px]" style={{ transform: "rotate(10.52deg) translateY(-50%)" }}>
            <div className="flex w-[232px] flex-col gap-[12px] rounded-[16px] bg-white/50 px-[23px] py-[16.5px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:border dark:border-border dark:bg-card/80">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[12.6px] font-medium leading-[1.6] text-[#b6b6b8] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                  Multi-feed-index
                </p>
                <div className="flex gap-[13px]">
                  <img src={socialIcon1} alt="" className="h-[27px] w-[27px] rounded" />
                  <img src={instagramIcon} alt="" className="h-[27px] w-[27px] rounded" />
                  <img src={linkedinIcon} alt="" className="h-[27px] w-[27px] rounded" />
                </div>
              </div>
              <p className="text-[12.6px] font-medium leading-[1.6] text-[#0a0f14] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                All dms/comment: AI handling
              </p>
            </div>
          </div>

          {/* CTA Buttons — CENTER */}
          <div className="z-10 flex flex-col items-center gap-[12px] sm:flex-row sm:gap-[20px]">
            <WaspRouterLink
              to={routes.PricingPageRoute.to}
              className="flex h-[48px] w-full items-center justify-center rounded-[12px] border border-[#e3e3e3] bg-white px-[24px] py-[12px] text-[16px] font-medium text-[#2e2e2e] shadow-[0px_1px_1px_0px_rgba(51,51,51,0.04),0px_3px_3px_0px_rgba(51,51,51,0.02),0px_6px_6px_0px_rgba(51,51,51,0.04)] transition-all hover:shadow-lg sm:h-[56px] sm:w-auto sm:px-[32px] sm:text-[18px] dark:border-border dark:bg-card dark:text-foreground"
            >
              View Pricing
            </WaspRouterLink>
            <WaspRouterLink
              to={routes.SignupRoute.to}
              className="relative flex h-[48px] w-full items-center justify-center gap-[6px] rounded-[12px] border px-[24px] py-[12px] text-[16px] font-medium text-white shadow-[0px_16px_8px_0px_rgba(189,113,29,0.01),0px_12px_6px_0px_rgba(189,113,29,0.04),0px_4px_4px_0px_rgba(189,113,29,0.07),0px_1.5px_3px_0px_rgba(34,34,34,0.08)] transition-all sm:h-[56px] sm:w-auto sm:px-[32px] sm:text-[18px]"
              style={{ backgroundColor: primaryColor, borderColor: darkerPrimary }}
            >
              Start Free
              <img src={arrowIcon} alt="" className="h-[24px] w-[24px]" />
              <div className="pointer-events-none absolute inset-[-1px] rounded-[inherit] shadow-[inset_0px_1px_2px_0px_rgba(255,255,255,0.12)]" />
            </WaspRouterLink>
          </div>

          {/* Growth card — RIGHT side, rotated */}
          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 lg:block xl:right-[10px]" style={{ transform: "rotate(-36.26deg) translateY(-50%)" }}>
            <div className="rounded-[16px] bg-white/50 px-[20px] pb-[37px] pt-[16px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm dark:border dark:border-border dark:bg-card/80">
              <div className="flex w-[98px] flex-col gap-[4px] leading-[1.6]">
                <p className="text-center text-[14px] font-semibold text-[#0a0f14] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                  Groth
                </p>
                <p className="text-[26px] font-semibold text-[#0a0f14] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                  +38%
                </p>
                <p className="text-[12px] font-medium text-[#2e2e2e] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                  +38% Brand Visibility
                </p>
              </div>
              <img src={growthChart} alt="" className="mt-[4px] h-[67px] w-[209px] dark:invert dark:opacity-80" />
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
      </div>

      <div className="h-[45px] w-full bg-gradient-to-b from-transparent to-background sm:h-[90px]" />
    </div>
  );
}

function darkenColor(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
