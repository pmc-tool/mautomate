import { useState } from "react";
import { cn } from "../../client/utils";
import featureTabScreenshot from "../../client/static/landing/feature-tab-screenshot.png";

interface FeatureTab {
  name: string;
  subtitle: string;
  title: string;
  description: string;
}

const tabs: FeatureTab[] = [
  {
    name: "Social Connect",
    subtitle: "Unified Audience Engagement",
    title: "Social Connect",
    description:
      "Writer is designed to help you generate high-quality texts instantly, without breaking a sweat. With our intuitive interface and powerful features, you can easily edit, export, or publish your AI-generated result.",
  },
  {
    name: "Brand Voice",
    subtitle: "Consistent Brand Messaging",
    title: "Brand Voice",
    description:
      "Create consistent brand voice profiles that guide all AI-generated content. Ensure every post, email, and message sounds authentically you across all channels.",
  },
  {
    name: "Chatbot",
    subtitle: "Smart Conversational Automation",
    title: "Chatbot",
    description:
      "Deploy AI chatbots trained on your data across websites, WhatsApp, Messenger, and more. Handle support, capture leads, and engage visitors 24/7.",
  },
  {
    name: "AI Image Generator",
    subtitle: "Instant Visual Creation",
    title: "AI Image Generator",
    description:
      "Create professional marketing images, social media graphics, and ad creatives with AI. No design skills required — just describe what you need.",
  },
  {
    name: "Social Media Agent",
    subtitle: "Automated Social Growth",
    title: "Social Media Agent",
    description:
      "Let AI handle your social media strategy. Auto-generate posts, optimize timing, respond to engagement, and grow your following on autopilot.",
  },
  {
    name: "SEO Agent",
    subtitle: "Search Ranking Optimization",
    title: "SEO Agent",
    description:
      "Generate SEO-optimized blog posts, meta descriptions, and content briefs. Rank higher with AI that understands search intent and your brand voice.",
  },
];

export default function FeatureTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const active = tabs[activeTab];

  return (
    <div className="mx-auto my-16 max-w-7xl px-4 sm:my-24 md:px-6 md:my-32">
      <div className="overflow-hidden rounded-4xl bg-[#9b7e69] sm:rounded-8xl dark:bg-card">
        {/* Tab buttons — horizontal scroll on mobile, grid on tablet, flex on desktop */}
        <div className="-mb-px flex gap-[12px] overflow-x-auto px-4 pt-4 sm:gap-[16px] sm:px-6 sm:pt-6 md:gap-[20px] md:px-8  lg:justify-center lg:gap-[32px] lg:px-[64px] lg:pt-[32px]">
          {tabs.map((tab, idx) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(idx)}
              className={cn(
                "flex min-w-[110px] shrink-0 flex-col items-start justify-center rounded-[12px] bg-white/[0.08] px-[14px] py-[12px] text-left transition-all sm:min-w-[120px] sm:rounded-[16px] sm:px-[20px] sm:py-[16px] lg:h-[116px] lg:w-[137px] lg:px-[27px] lg:py-[19px]",
                idx === activeTab && "border-b-[3px] border-[#f7a265]",
              )}
            >
              <p className="text-[12px] font-semibold leading-[1.2] text-white sm:text-[13px] lg:text-[14px]">{tab.name}</p>
              <p className="mt-[4px] hidden text-[11px] leading-[1.2] text-white/50 sm:block sm:text-[12px]">{tab.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Content area — stack on mobile, side-by-side on desktop */}
        {/* flex flex-col gap-[24px] px-4 pb-6 pt-6 sm:gap-[32px] sm:px-6 sm:pb-8 sm:pt-8 md:px-8 lg:flex-row lg:gap-[40px] lg:px-[64px] lg:pb-0 lg:pt-[56px] */}
        <div className="md:flex items-center gap-6 overflow-hidden p-8 md:p-16  " >
          {/* Left: Screenshot */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-white/5 shadow-[0px_20px_50px_0px_rgba(0,0,0,0.1)] sm:rounded-[20px] lg:h-[390px] lg:flex-1/2">
            <div className="absolute inset-[8px] overflow-hidden rounded-2xl sm:inset-[12px] sm:rounded-2xl">
              <img
                src={featureTabScreenshot}
                alt={active.title}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
          </div>

          {/* Right: Description */}
         
          <div className="flex-1/2 flex  flex-col gap-3  text-white sm:gap-5  pt-4 md:p-4 ">
            <p className="text-xl font-semibold leading-[1.2] tracking-[0.4px] sm:text-[32px] lg:text-[40px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              {active.title}
            </p>
            <p className="text-[14px] leading-[1.5] opacity-60 sm:text-[15px] sm:leading-[22px] lg:text-[17px] lg:leading-[24px]">
              {active.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
