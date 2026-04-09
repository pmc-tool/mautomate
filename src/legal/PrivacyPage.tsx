import { useEffect } from "react";
import Footer from "../landing-page/components/Footer";
import { footerNavigation } from "../landing-page/contentSections";
import { useBranding } from "../branding/BrandingContext";

export default function PrivacyPage() {
  const branding = useBranding();
  const appName = branding.appName || "mAutomate";
  const domain = branding.domain || "mautomate.ai";
  const lastUpdated = "April 9, 2026";

  useEffect(() => {
    document.title = `Privacy Policy — ${appName}`;
    const desc = document.querySelector('meta[name="description"]');
    const content = `Read the Privacy Policy for ${appName} (${domain}) — how we collect, use, store, and protect your personal data, including GDPR and CCPA rights.`;
    if (desc) desc.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, [appName, domain]);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-medium text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="lead text-lg leading-relaxed text-muted-foreground">
            At {appName}, we take your privacy seriously. This Privacy Policy explains what
            personal information we collect, how we use it, who we share it with, and the rights
            you have over your data when you use our marketing automation platform at{" "}
            <a href={`https://${domain}`} className="text-[#bd711d] hover:underline">
              {domain}
            </a>
            .
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> name, email address, password (hashed),
              company name, and billing details when you create an account or subscribe.
            </li>
            <li>
              <strong>User Content:</strong> articles, posts, keywords, brand voice profiles,
              chatbot training data, and any other content you upload or generate using the
              Service.
            </li>
            <li>
              <strong>Connected Accounts:</strong> OAuth tokens and credentials for third-party
              platforms you connect (e.g., Facebook, Instagram, LinkedIn, WordPress, Telegram).
              These are encrypted at rest.
            </li>
            <li>
              <strong>Usage Data:</strong> log data, IP address, browser type, device information,
              pages visited, features used, and timestamps. We use this to improve the Service
              and detect abuse.
            </li>
            <li>
              <strong>Cookies & Tracking:</strong> we use cookies and similar technologies for
              authentication, preferences, analytics, and security. See Section 8 for details.
            </li>
            <li>
              <strong>Payment Information:</strong> processed by our payment provider (Stripe). We
              do not store full credit card numbers on our servers.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain the Service;</li>
            <li>Process payments, subscriptions, and credit purchases;</li>
            <li>Personalize your experience and remember your preferences;</li>
            <li>Send transactional emails (account, billing, security alerts);</li>
            <li>Send product updates and marketing communications (you can opt out at any time);</li>
            <li>Detect, prevent, and address fraud, abuse, or security incidents;</li>
            <li>Comply with legal obligations and enforce our Terms of Service;</li>
            <li>Improve our AI features and overall product quality.</li>
          </ul>

          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <p>If you are in the European Economic Area, we process your data under the following legal bases:</p>
          <ul>
            <li><strong>Contract:</strong> to deliver the Service you signed up for;</li>
            <li><strong>Legitimate Interest:</strong> to improve and secure the Service;</li>
            <li><strong>Consent:</strong> for marketing emails and optional features;</li>
            <li><strong>Legal Obligation:</strong> to comply with applicable laws.</li>
          </ul>

          <h2>4. How We Share Your Information</h2>
          <p>
            We do not sell your personal information. We share data only in the following limited
            circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> trusted third parties who help us operate the
              Service (hosting, payment processing, email delivery, analytics, AI providers like
              OpenAI). They are bound by confidentiality and data protection agreements.
            </li>
            <li>
              <strong>Third-Party Integrations:</strong> when you connect your social or
              publishing accounts, we transmit content to those platforms at your direction.
            </li>
            <li>
              <strong>Legal Requirements:</strong> when required by law, court order, or to
              protect our rights, property, safety, or that of our users.
            </li>
            <li>
              <strong>Business Transfers:</strong> in connection with a merger, acquisition, or
              sale of assets, your information may be transferred to the acquiring entity.
            </li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide the Service. After account deletion, we retain data only as required to
            comply with legal obligations, resolve disputes, or enforce our agreements.
            Aggregated and anonymized data may be retained indefinitely.
          </p>

          <h2>6. Data Security</h2>
          <p>
            We use industry-standard security measures to protect your data, including encryption
            at rest (AES-256) and in transit (TLS 1.2+), access controls, and regular security
            audits. Sensitive credentials such as OAuth tokens and API keys are encrypted before
            storage. However, no method of transmission or storage is 100% secure, and we cannot
            guarantee absolute security.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> request a copy of the personal data we hold about you;</li>
            <li><strong>Correction:</strong> ask us to correct inaccurate or incomplete data;</li>
            <li><strong>Deletion:</strong> request deletion of your account and personal data;</li>
            <li><strong>Portability:</strong> receive your data in a portable, machine-readable format;</li>
            <li><strong>Restriction:</strong> ask us to limit how we process your data;</li>
            <li><strong>Objection:</strong> object to processing based on legitimate interests;</li>
            <li><strong>Withdraw consent:</strong> at any time, where processing is based on consent.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:privacy@${domain}`} className="text-[#bd711d] hover:underline">
              privacy@{domain}
            </a>
            . We will respond within 30 days.
          </p>

          <h2>8. Cookies & Tracking Technologies</h2>
          <p>We use cookies and similar technologies for the following purposes:</p>
          <ul>
            <li><strong>Essential cookies:</strong> required for authentication and core Service functionality;</li>
            <li><strong>Preference cookies:</strong> remember your settings (theme, language);</li>
            <li><strong>Analytics cookies:</strong> help us understand how the Service is used;</li>
            <li><strong>Marketing cookies:</strong> only set with your consent.</li>
          </ul>
          <p>
            You can control cookie preferences through our cookie consent banner or your browser
            settings. Disabling essential cookies may break Service functionality.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be processed in countries other than where you reside, including
            the United States. When we transfer data internationally, we use appropriate
            safeguards such as Standard Contractual Clauses approved by the European Commission.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            The Service is not intended for users under the age of 18. We do not knowingly
            collect personal information from children. If you believe we have collected
            information from a child, please contact us so we can delete it.
          </p>

          <h2>11. California Residents (CCPA)</h2>
          <p>
            If you are a California resident, you have additional rights under the California
            Consumer Privacy Act, including the right to know what personal information we
            collect, the right to delete personal information, and the right to opt out of the
            sale of personal information. We do not sell personal information.
          </p>

          <h2>12. Third-Party Links</h2>
          <p>
            The Service may contain links to third-party websites and services. We are not
            responsible for the privacy practices of those sites. We encourage you to read their
            privacy policies before providing any personal information.
          </p>

          <h2>13. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our
            practices or for legal reasons. We will notify you of material changes by email or
            through the Service. The "Last updated" date at the top of this page indicates when
            the Policy was last revised.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or how we handle your data,
            please contact us:
          </p>
          <ul>
            <li>
              Email:{" "}
              <a href={`mailto:privacy@${domain}`} className="text-[#bd711d] hover:underline">
                privacy@{domain}
              </a>
            </li>
            <li>
              Website:{" "}
              <a href={`https://${domain}`} className="text-[#bd711d] hover:underline">
                {domain}
              </a>
            </li>
          </ul>
        </div>
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
