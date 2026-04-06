import Footer from "./components/Footer";
import { footerNavigation } from "./contentSections";
import { useBranding } from "../branding/BrandingContext";

export default function TermsPage() {
  const branding = useBranding();
  const appName = branding.appName || "mAutomate.ai";
  const domain = branding.domain || "mautomate.ai";
  const contactEmail = branding.contactEmail || "contact@mautomate.ai";

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24 md:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <a href="/" className="mb-8 inline-block text-sm font-medium text-primary hover:underline" style={{ fontFamily: "'Poppins', sans-serif" }}>
            &larr; Back to Home
          </a>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Last updated: April 6, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[15px] leading-[1.8] text-foreground/80 sm:text-[16px]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using {appName} (the "Service"), available at {domain}, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              2. Description of Service
            </h2>
            <p>
              {appName} is an AI-powered marketing automation platform that provides tools including but not limited to: social media management (Social Connect), AI chatbot creation and deployment, brand voice profiling, AI image generation, social media content automation, SEO content generation, video creation, centralized inbox management, and content calendar scheduling. The Service is provided on a subscription and credit-based model.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              3. Account Registration
            </h2>
            <p>
              To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to share your account credentials with any third party.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              4. Credits and Payment
            </h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>New accounts receive 100 free credits upon registration, with no credit card required.</li>
              <li>The Service operates on a credit-based usage model. Credits are consumed when you use AI-powered features such as content generation, image creation, chatbot interactions, video generation, and SEO analysis.</li>
              <li>Subscription plans (Starter, Growth, Pro, and Agency) provide monthly credit allocations. Additional credits may be purchased through top-up plans.</li>
              <li>All payments are processed securely through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis.</li>
              <li>Unused monthly credits do not roll over to the next billing period unless otherwise stated in your plan.</li>
              <li>Refunds are handled on a case-by-case basis. Contact {contactEmail} for refund requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              5. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Generate, store, or distribute content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</li>
              <li>Violate any applicable local, state, national, or international law or regulation.</li>
              <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with a person or entity.</li>
              <li>Upload or transmit viruses, malware, or any other malicious code.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or computer systems or networks connected to the Service.</li>
              <li>Use the Service to send unsolicited communications (spam) through connected social media accounts or chatbot channels.</li>
              <li>Use AI-generated content to deliberately deceive or mislead audiences in ways that could cause harm.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              6. Social Media and Third-Party Integrations
            </h2>
            <p>
              The Service allows you to connect third-party social media accounts (including Facebook, Instagram, X, LinkedIn, TikTok, YouTube, WhatsApp, Messenger, and Telegram). By connecting these accounts, you authorize {appName} to access and manage your accounts as necessary to provide the Service. You are responsible for complying with the terms of service of each third-party platform. We securely encrypt all stored credentials and access tokens. You may disconnect any linked account at any time through your dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              7. AI-Generated Content
            </h2>
            <p>
              Content generated by the Service's AI features (including text, images, and videos) is provided as a tool to assist your marketing efforts. You retain ownership of content you create using the Service. However, you are solely responsible for reviewing, editing, and ensuring the accuracy and appropriateness of all AI-generated content before publishing or distributing it. {appName} does not guarantee the accuracy, completeness, or suitability of AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              8. Chatbot and Messaging Services
            </h2>
            <p>
              When deploying chatbots through the Service, you are responsible for ensuring that your chatbot interactions comply with applicable laws, including consumer protection laws and platform-specific policies. You must clearly disclose to end users that they are interacting with an AI-powered chatbot. You are responsible for the training data you provide and the responses your chatbot generates.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              9. Intellectual Property
            </h2>
            <p>
              The Service and its original content (excluding user-generated and AI-generated content), features, and functionality are and will remain the exclusive property of {appName} and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of {appName}.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              10. Data and Privacy
            </h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</a>.
              By using the Service, you consent to the collection and use of information as described in the Privacy Policy. Data you provide for chatbot training, brand voice configuration, and content generation is processed solely to provide the Service and is not shared with third parties except as necessary to deliver the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              11. Service Availability and Modifications
            </h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service. We may also update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              12. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, {appName} and its affiliates, officers, employees, agents, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the Service; any unauthorized access to or alteration of your data; or any other matter relating to the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              13. Termination
            </h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              14. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="font-medium text-primary hover:underline">
                {contactEmail}
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
