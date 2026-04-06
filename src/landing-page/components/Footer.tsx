import { useBranding } from "../../branding/BrandingContext";
import useColorMode from "../../client/hooks/useColorMode";
import footerLogoLight from "../../client/static/logo-light.png";
import footerLogoDark from "../../client/static/logo-dark.png";

interface NavigationItem {
  name: string;
  href: string;
}

export default function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    links: NavigationItem[];
    integrations: NavigationItem[];
  };
}) {
  const branding = useBranding();
  const [colorMode] = useColorMode();
  const currentYear = new Date().getFullYear();
  const primaryColor = branding.primaryColor || "#bd711d";
  const darkerPrimary = darkenColor(primaryColor, 0.15);
  const defaultLogo = colorMode === "dark" ? footerLogoDark : footerLogoLight;
  const copyrightText = branding.copyrightText || `${currentYear} ${branding.domain || "mAutomate.ai"}. All rights reserved.`;
  const termsUrl = branding.termsUrl || "/terms";
  const privacyUrl = branding.privacyUrl || "/privacy";

  return (
    <footer className="bg-[#f8f4f1] dark:bg-card">
      <div className="mx-auto max-w-[1280px] px-4 pb-[20px] pt-0 sm:px-6 md:px-8 lg:px-[95px]">
        {/* Main content area with bottom border */}
        <div className="border-b border-[rgba(10,15,20,0.08)] pb-[20px] pt-[60px] sm:pt-[80px] md:pt-[100px] lg:pt-[132px] dark:border-border">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-8">
            {/* Left: Link columns */}
            <div className="flex gap-[40px] sm:gap-[60px] md:gap-[80px] lg:gap-[163px]">
              {/* Links column */}
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[rgba(10,15,20,0.4)] dark:text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Links
                </h3>
                <ul className="mt-[24px] space-y-[12px] sm:mt-[36px] sm:space-y-[14px]">
                  {footerNavigation.links.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-[14px] font-medium leading-[22.5px] text-[#0a0f14] transition-colors hover:text-[#bd711d] sm:text-[15px] dark:text-foreground dark:hover:text-primary"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Integrations column */}
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[rgba(10,15,20,0.4)] dark:text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Integrations
                </h3>
                <ul className="mt-[24px] space-y-[12px] sm:mt-[36px] sm:space-y-[14px]">
                  {footerNavigation.integrations.map((item) => (
                    <li key={item.name}>
                      <a target="_blank"
                        href={item.href}
                        className="text-[14px] font-medium leading-[22.5px] text-[#0a0f14] transition-colors hover:text-[#bd711d] sm:text-[15px] dark:text-foreground dark:hover:text-primary"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="max-w-[483px]">
              <h3 className="text-[22px] font-semibold leading-[1.3] text-[#0a0f14] sm:text-[28px] sm:leading-[36.4px] dark:text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {branding.footerCtaTitle || "Smart Campaign Orchestrator"}
              </h3>
              <p className="mt-[12px] text-[14px] leading-[1.7] text-[rgba(10,15,20,0.55)] sm:text-[15px] sm:leading-[25.5px] dark:text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {branding.footerCtaDesc || "AI marketing automation platform for campaign orchestration, audience segmentation, and attribution analytics."}
              </p>
              <div className="mt-[24px] flex flex-col gap-[12px] sm:mt-[32px]">
                <a
                  href={`mailto:${branding.contactEmail || "contact@mautomate.ai"}`}
                  className="flex h-[48px] items-center justify-center rounded-[10px] border px-[24px] py-[12px] text-[14px] font-semibold text-white shadow-[0px_16px_8px_0px_rgba(189,113,29,0.01),0px_12px_6px_0px_rgba(189,113,29,0.04),0px_4px_4px_0px_rgba(189,113,29,0.07),0px_1.5px_3px_0px_rgba(34,34,34,0.08)] transition-all sm:h-[50.5px] sm:px-[32px] sm:text-[15px]"
                  style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: primaryColor, borderColor: darkerPrimary }}
                >
                  Contact Us
                </a>
                <a
                  href="#"
                  className="flex h-[48px] items-center justify-center rounded-[8px] border border-[rgba(10,15,20,0.25)] text-[14px] font-semibold text-[#0a0f14] transition-colors hover:bg-black/5 sm:h-[52.5px] sm:text-[15px] dark:border-border dark:text-foreground"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Subscribe
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark area: big logo with top fade */}
        <div className="relative mt-[20px] h-[120px] overflow-hidden sm:h-[160px] lg:h-[220px]">
          {/* Top fade-out gradient overlay — light mode */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[80px] sm:h-[105px] dark:hidden"
            style={{ background: "linear-gradient(to bottom, #f8f4f1 0%, transparent 100%)" }}
          />
          {/* Top fade-out gradient overlay — dark mode */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-[80px] bg-gradient-to-b from-card to-transparent sm:h-[105px] dark:block"
          />
          {/* Big logo as watermark — light mode */}
          <img
            src={footerLogoLight}
            alt={branding.appName}
            className="absolute  left-1/2 w-full max-w-[900px] -translate-x-1/2 object-contain dark:hidden"
          />
          {/* Big logo as watermark — dark mode */}
          <img
            src={footerLogoDark}
            alt={branding.appName}
            className="absolute  left-1/2 hidden w-full max-w-[900px] -translate-x-1/2 opacity-30  dark:block"
          />
        </div>

        {/* Bottom bar */}
        <div className="mt-[16px] flex flex-col items-center gap-3 sm:mt-[20px] sm:flex-row sm:justify-between sm:gap-0">
          <p className="text-[13px] font-medium leading-[22.5px] text-[#7c7f85] sm:text-[15px] dark:text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {copyrightText}
          </p>
          <div className="flex gap-[16px] sm:gap-[27px]">
            <a
              href={termsUrl.startsWith("http") ? termsUrl : `https://${branding.domain || "mautomate.ai"}${termsUrl}`}
              className="text-[13px] font-medium leading-[22.5px] text-[#7c7f85] transition-colors hover:text-[#0a0f14] sm:text-[15px] dark:text-muted-foreground dark:hover:text-foreground"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Terms of Service
            </a>
            <a
              href={privacyUrl.startsWith("http") ? privacyUrl : `https://${branding.domain || "mautomate.ai"}${privacyUrl}`}
              className="text-[13px] font-medium leading-[22.5px] text-[#7c7f85] transition-colors hover:text-[#0a0f14] sm:text-[15px] dark:text-muted-foreground dark:hover:text-foreground"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function darkenColor(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
