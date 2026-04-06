import Footer from "./components/Footer";
import { footerNavigation } from "./contentSections";
import { useBranding } from "../branding/BrandingContext";

export default function AboutPage() {
  const branding = useBranding();
  const appName = branding.appName || "mAutomate.ai";

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24 md:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <a href="/" className="mb-8 inline-block text-sm font-medium text-primary hover:underline" style={{ fontFamily: "'Poppins', sans-serif" }}>
            &larr; Back to Home
          </a>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            About {appName}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            The AI marketing operating system built for modern teams.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-[15px] leading-[1.8] text-foreground/80 sm:text-[16px]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Our Mission
            </h2>
            <p>
              {appName} exists to give every marketing team — from solo founders to agencies managing dozens of brands — a single platform that replaces the patchwork of disconnected tools. We believe AI should handle the repetitive work so marketers can focus on strategy, creativity, and growth.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              What We Do
            </h2>
            <p className="mb-4">
              {appName} is an all-in-one AI marketing automation platform that brings together content creation, social media management, customer engagement, and analytics under one roof. Our core capabilities include:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Social Connect</strong> — Link and manage all your social accounts (Facebook, Instagram, X, LinkedIn, TikTok, YouTube) from a unified dashboard.
              </li>
              <li>
                <strong>Brand Voice</strong> — Create AI-powered brand voice profiles that ensure every piece of content sounds authentically like your brand across all channels.
              </li>
              <li>
                <strong>AI Chatbot</strong> — Deploy intelligent chatbots trained on your data across your website, WhatsApp, Messenger, Telegram, and Instagram to handle support, capture leads, and engage visitors 24/7.
              </li>
              <li>
                <strong>AI Image Generator</strong> — Create professional marketing visuals, social media graphics, and ad creatives from text descriptions — no design skills required.
              </li>
              <li>
                <strong>Social Media Agent</strong> — Let AI generate, schedule, and auto-publish posts across all your connected platforms with optimized timing and hashtags.
              </li>
              <li>
                <strong>SEO Agent</strong> — Generate SEO-optimized blog posts, meta descriptions, and content briefs with built-in keyword research and direct WordPress publishing.
              </li>
              <li>
                <strong>Video Studio</strong> — Create AI-generated videos including text-to-video, AI avatars, and long-form narrated story videos from simple prompts.
              </li>
              <li>
                <strong>Central Inbox</strong> — Manage all customer conversations from web chat, WhatsApp, Telegram, Messenger, and Instagram in one unified inbox with AI-assisted responses.
              </li>
              <li>
                <strong>Post Hub</strong> — A centralized content management system for creating, scheduling, and publishing both SEO and social media content with a visual content calendar.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Who We Serve
            </h2>
            <p>
              Whether you're a startup founder wearing every hat, a growing team scaling your marketing operations, or an agency managing campaigns for multiple clients — {appName} adapts to your needs. Our flexible credit-based pricing means you only pay for what you use, starting with a free 100-credit trial that requires no credit card.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Our Approach
            </h2>
            <p>
              We combine the power of AI with intuitive design. Every feature in {appName} is built to save time without sacrificing quality. Our platform learns from your brand voice, understands your audience, and delivers results — from automated campaign orchestration to real-time attribution analytics. We replace disconnected tool stacks with one cohesive workflow so your team can move faster and convert better.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Get in Touch
            </h2>
            <p>
              Have questions or want to learn more? Reach out to us at{" "}
              <a href={`mailto:${branding.contactEmail || "contact@mautomate.ai"}`} className="font-medium text-primary hover:underline">
                {branding.contactEmail || "contact@mautomate.ai"}
              </a>
              . We'd love to hear from you.
            </p>
          </section>
        </div>
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
