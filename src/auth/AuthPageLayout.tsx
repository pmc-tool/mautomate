import { type ReactNode } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import logo from "../client/static/logo.png";
import { useBranding } from "../branding/BrandingContext";

interface AuthPageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthPageLayout({
  children,
  title = "Welcome",
  subtitle = "Sign in to continue",
}: AuthPageLayoutProps) {
  const branding = useBranding();
  const primaryColor = branding.primaryColor || "#bd711d";
  const authBg = branding.authBgColor || "#1a1207";
  const appName = branding.appName || "mAutomate";
  const domain = branding.domain || "mautomate.ai";
  const tagline = branding.tagline || "Marketing OS";
  const slogan = branding.slogan || "The complete AI Marketing Operating System. Automate Content, Reels, DMs, and Growth in One Platform.";
  const copyrightText = branding.copyrightText || `${new Date().getFullYear()} ${domain}. All rights reserved.`;
  const logoSrc = branding.logoUrl || logo;

  return (
    <div className="flex min-h-screen bg-[#f8f4f1] dark:bg-background">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12" style={{ backgroundColor: authBg }}>
        {/* Warm gradient orbs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full blur-[120px]" style={{ backgroundColor: `${primaryColor}26` }} />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full blur-[100px]" style={{ backgroundColor: `${primaryColor}1a` }} />
        <div className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full blur-[80px]" style={{ backgroundColor: `${primaryColor}14` }} />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              `linear-gradient(${primaryColor}4d 1px, transparent 1px), linear-gradient(90deg, ${primaryColor}4d 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <WaspRouterLink to={routes.LandingPageRoute.to}>
            <img src={logoSrc} alt={appName} className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).src = logo; }} />
          </WaspRouterLink>
        </div>

        {/* Center: Hero content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2
              className="text-[44px] font-bold leading-[1.1] tracking-[-0.5px]"
              style={{ fontFamily: "'Inter Tight', sans-serif", color: primaryColor }}
            >
              {tagline}
            </h2>
            <h2
              className="mt-1 text-[44px] font-bold leading-[1.1] tracking-[-0.5px] text-white"
              style={{ fontFamily: "'Inter Tight', sans-serif" }}
            >
              {domain}
            </h2>
          </div>
          <p
            className="max-w-[380px] text-[16px] leading-[1.7] text-white/50"
            style={{ fontFamily: "'Inter Tight', sans-serif" }}
          >
            {slogan}
          </p>
          <div className="space-y-4 pt-2">
            {[
              "AI content generation for SEO & Social",
              "Multi-platform publishing & scheduling",
              "Brand voice consistency across channels",
              "Smart chatbot & DM automation",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ borderColor: `${primaryColor}4d`, backgroundColor: `${primaryColor}1a`, border: `1px solid ${primaryColor}4d` }}>
                  <svg
                    className="h-3 w-3"
                    style={{ color: primaryColor }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span
                  className="text-[14px] font-medium text-white/60"
                  style={{ fontFamily: "'Inter Tight', sans-serif" }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="relative z-10">
          <p
            className="text-[13px] text-white/25"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            &copy; {copyrightText}
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12">
        {/* Mobile logo */}
        <WaspRouterLink
          to={routes.LandingPageRoute.to}
          className="mb-10 lg:hidden"
        >
          <img src={logoSrc} alt={appName} className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).src = logo; }} />
        </WaspRouterLink>

        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1
              className="text-[28px] font-bold tracking-tight text-[#0a0f14] dark:text-foreground"
              style={{ fontFamily: "'Inter Tight', sans-serif" }}
            >
              {title}
            </h1>
            <p
              className="text-[15px] text-[#7c7f85] dark:text-muted-foreground"
              style={{ fontFamily: "'Inter Tight', sans-serif" }}
            >
              {subtitle}
            </p>
          </div>

          <div className="rounded-[16px] border border-[#eee4dd] bg-white p-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)] sm:p-8 dark:border-border dark:bg-card dark:shadow-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
