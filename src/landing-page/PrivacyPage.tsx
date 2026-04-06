import Footer from "./components/Footer";
import { footerNavigation } from "./contentSections";
import { useBranding } from "../branding/BrandingContext";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-muted-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Last updated: April 6, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[15px] leading-[1.8] text-foreground/80 sm:text-[16px]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              1. Introduction
            </h2>
            <p>
              {appName} ("we," "our," or "us"), operated at {domain}, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI marketing automation platform (the "Service"). Please read this policy carefully. By using the Service, you consent to the practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              2. Information We Collect
            </h2>

            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">2.1 Information You Provide</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe. We do not store your full credit card numbers on our servers.</li>
              <li><strong>Brand Voice Data:</strong> Brand descriptions, tone preferences, sample content, and style guidelines you provide to create brand voice profiles.</li>
              <li><strong>Chatbot Training Data:</strong> Documents, URLs, FAQs, and other content you upload to train your AI chatbots.</li>
              <li><strong>Content:</strong> Text, images, videos, and other content you create, upload, or generate using the Service.</li>
              <li><strong>Social Account Credentials:</strong> OAuth tokens and access credentials when you connect third-party social media accounts. These are encrypted at rest using industry-standard encryption.</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, credit consumption, and interaction patterns within the Service.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution.</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
              <li><strong>Cookies:</strong> We use essential cookies for authentication and session management, and analytics cookies to improve the Service.</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">2.3 Information from Third Parties</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Social Media Platforms:</strong> When you connect accounts (Facebook, Instagram, X, LinkedIn, TikTok, YouTube, WhatsApp, Messenger, Telegram), we receive profile information, page/account data, and engagement metrics as authorized by you and permitted by each platform.</li>
              <li><strong>WordPress Sites:</strong> When using the SEO Agent to publish content, we access your WordPress site via credentials you provide.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Provide, maintain, and improve the Service, including AI content generation, chatbot functionality, social media management, and analytics.</li>
              <li>Process transactions and manage your subscription and credit balance.</li>
              <li>Train and customize AI features to match your brand voice and preferences. Your data is used only for your account and is not used to train general AI models.</li>
              <li>Send you technical notices, updates, security alerts, and support messages.</li>
              <li>Respond to your comments, questions, and customer service requests.</li>
              <li>Monitor and analyze trends, usage, and activities to improve user experience.</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              4. Data Sharing and Disclosure
            </h2>
            <p className="mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Service Providers:</strong> We share data with third-party providers that help us operate the Service, including Stripe (payments), OpenAI (AI content generation), Novita AI (image generation), fal.ai (video generation), and social media platform APIs. These providers are contractually obligated to protect your data.</li>
              <li><strong>Social Media Platforms:</strong> When you use features like Social Connect, Social Media Agent, or Central Inbox, we transmit content and data to the platforms you've connected, as directed by you.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share information with third parties when you give us explicit consent to do so.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              5. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your data. Social media credentials and access tokens are encrypted at rest. Payment processing is handled by Stripe, a PCI-DSS compliant provider. We use HTTPS encryption for all data in transit. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              6. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Service. Content you create, chatbot training data, and brand voice profiles are retained until you delete them or close your account. Upon account deletion, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              7. Your Rights and Choices
            </h2>
            <p className="mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal obligations.</li>
              <li><strong>Portability:</strong> Request a machine-readable copy of your data.</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time using the link in the email.</li>
              <li><strong>Disconnect Accounts:</strong> Remove connected social media accounts at any time through your dashboard, which revokes our access to those platforms.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="font-medium text-primary hover:underline">{contactEmail}</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              8. Chatbot and End-User Data
            </h2>
            <p>
              When end users interact with chatbots you deploy through the Service, we collect conversation data (messages, timestamps, and channel identifiers) to provide chatbot functionality and conversation history. This data is associated with your account and is accessible through the Central Inbox feature. You are responsible for informing your end users about data collection through your chatbot and for complying with applicable privacy laws regarding their data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              9. Cookies
            </h2>
            <p>
              We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze usage patterns. Essential cookies are required for the Service to function. You can control cookie preferences through your browser settings, though disabling essential cookies may impact Service functionality.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              10. Children's Privacy
            </h2>
            <p>
              The Service is not intended for individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal data from a child under 16, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              12. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at{" "}
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
