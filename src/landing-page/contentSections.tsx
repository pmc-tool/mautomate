import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import messync from "../client/static/examples/messync.webp";
import microinfluencerClub from "../client/static/examples/microinfluencers.webp";
import promptpanda from "../client/static/examples/promptpanda.webp";
import reviewradar from "../client/static/examples/reviewradar.webp";
import scribeist from "../client/static/examples/scribeist.webp";
import searchcraft from "../client/static/examples/searchcraft.webp";
import { BlogUrl, DocsUrl } from "../shared/common";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "AI Campaign Builder",
    description: "Generate end-to-end campaigns across email, social, and ads.",
    emoji: "🤝",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Smart Segmentation",
    description: "Auto-group contacts by behavior, lifecycle stage, and intent.",
    emoji: "🔐",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Journey Automation",
    description: "Build trigger-based journeys with drag-and-drop workflows.",
    emoji: "🥞",
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "Lead Scoring",
    description: "Prioritize high-intent leads and route them to sales instantly.",
    emoji: "💸",
    href: DocsUrl,
    size: "large",
  },
  {
    name: "Attribution Dashboard",
    description: "Track revenue impact by channel, campaign, and audience segment.",
    emoji: "💼",
    href: DocsUrl,
    size: "large",
  },
  {
    name: "A/B Optimization",
    description: "Continuously test subject lines, creatives, and send times.",
    emoji: "📈",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "CRM Sync",
    description: "Connect HubSpot, Salesforce, and your data warehouse.",
    emoji: "📧",
    href: DocsUrl,
    size: "small",
  },
  {
    name: "AI Content Assistant",
    description: "Create brand-aligned copy for ads, emails, and landing pages.",
    emoji: "🤖",
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "Cross-Channel Orchestration",
    description: "Coordinate every touchpoint from first click to closed-won.",
    emoji: "🚀",
    href: DocsUrl,
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Ava Thompson",
    role: "Growth Lead @ Nexora",
    avatarSrc: daBoiAvatar,
    socialUrl: "https://x.com",
    quote:
      "mAutomate.ai cut campaign launch time from days to hours and gave us clear ROI by channel.",
  },
  {
    name: "Daniel Park",
    role: "Founder @ CloudScale",
    avatarSrc: daBoiAvatar,
    socialUrl: "https://www.linkedin.com",
    quote:
      "Our pipeline quality improved within two weeks because the lead scoring and journey automation just worked.",
  },
  {
    name: "Sofia Rahman",
    role: "Marketing Director @ BrightPath",
    avatarSrc: daBoiAvatar,
    socialUrl: "https://x.com",
    quote:
      "We replaced four disconnected tools with one workflow platform and improved conversion rates across the funnel.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "What does mAutomate.ai help with first?",
    answer:
      "Most teams start with campaign automation and audience segmentation, then expand into attribution and optimization.",
  },
  {
    id: 2,
    question: "Can we integrate mAutomate.ai with our existing stack?",
    answer:
      "Yes. You can connect CRM, email, ad platforms, and analytics tools to keep data and workflows in sync.",
  },
  {
    id: 3,
    question: "Is this built for small teams or enterprise?",
    answer:
      "Both. Start with lightweight automations, then scale to multi-team and multi-brand campaign orchestration.",
  },
];

export const footerNavigation = {
  app: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Articles", href: "/articles" },
    { name: "Documentation", href: DocsUrl },
    { name: "Blog", href: BlogUrl },
  ],
  company: [
    { name: "About", href: "https://mautomate.ai/about" },
    { name: "Contact", href: "https://mautomate.ai/contact" },
    { name: "Privacy", href: "https://mautomate.ai/privacy" },
    { name: "Terms of Service", href: "https://mautomate.ai/terms" },
  ],
};

export const examples = [
  {
    name: "Welcome Flow",
    description: "Turn new signups into activated users with AI-timed sequences.",
    imageSrc: kivo,
    href: "https://mautomate.ai",
  },
  {
    name: "Lead Re-Engagement",
    description: "Recover dormant leads using personalized cross-channel journeys.",
    imageSrc: messync,
    href: "https://mautomate.ai",
  },
  {
    name: "Product Launch",
    description: "Coordinate teaser, launch-day, and follow-up campaigns automatically.",
    imageSrc: microinfluencerClub,
    href: "https://mautomate.ai",
  },
  {
    name: "Churn Prevention",
    description: "Detect churn signals and trigger retention workflows in real time.",
    imageSrc: promptpanda,
    href: "https://mautomate.ai",
  },
  {
    name: "Pipeline Acceleration",
    description: "Auto-prioritize in-market leads and notify sales instantly.",
    imageSrc: reviewradar,
    href: "https://mautomate.ai",
  },
  {
    name: "Content Repurposing",
    description: "Transform one brief into emails, ads, and social content variations.",
    imageSrc: scribeist,
    href: "https://mautomate.ai",
  },
  {
    name: "Attribution Reporting",
    description: "See which campaigns drive pipeline and revenue every week.",
    imageSrc: searchcraft,
    href: "https://mautomate.ai",
  },
];
