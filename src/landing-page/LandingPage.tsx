import Clients from "./components/Clients";
import FAQ from "./components/FAQ";
import FeatureTabs from "./components/FeatureTabs";
import SocialConnections from "./components/FeaturesGrid";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Testimonials from "./components/Testimonials";
import { faqs, footerNavigation, testimonials } from "./contentSections";
import AIReady from "./ExampleHighlightedFeature";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="isolate">
        <Hero />
        <Clients />
        <AIReady />
        <FeatureTabs />
        <SocialConnections />
        <Testimonials testimonials={testimonials} />
        <FAQ faqs={faqs} />
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
