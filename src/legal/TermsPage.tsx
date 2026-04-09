import { useEffect } from "react";
import Footer from "../landing-page/components/Footer";
import { footerNavigation } from "../landing-page/contentSections";
import { useBranding } from "../branding/BrandingContext";

export default function TermsPage() {
  const branding = useBranding();
  const appName = branding.appName || "mAutomate";
  const domain = branding.domain || "mautomate.ai";
  const lastUpdated = "April 9, 2026";

  useEffect(() => {
    document.title = `Terms of Service — ${appName}`;
    const desc = document.querySelector('meta[name="description"]');
    const content = `Read the Terms of Service for ${appName} (${domain}) — covering account use, subscriptions, content ownership, AI-generated output, and user responsibilities.`;
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
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="lead text-lg leading-relaxed text-muted-foreground">
            Welcome to {appName}. These Terms of Service ("Terms") govern your access to and use
            of our marketing automation platform, including our website, dashboard, APIs, and any
            related services (collectively, the "Service"). By creating an account or using the
            Service, you agree to be bound by these Terms.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using {appName}, you confirm that you have read, understood, and
            agree to these Terms and our Privacy Policy. If you are using the Service on behalf of
            an organization, you represent that you have the authority to bind that organization
            to these Terms.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old (or the age of legal majority in your jurisdiction)
            to use the Service. You agree to provide accurate, current, and complete information
            during registration and to update such information as needed.
          </p>

          <h2>3. Account & Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activities that occur under your account. You agree to notify us
            immediately of any unauthorized use of your account. We are not liable for losses
            caused by unauthorized account access resulting from your failure to safeguard
            credentials.
          </p>

          <h2>4. Subscription, Credits & Billing</h2>
          <p>
            {appName} operates on a subscription and credit-based model. Subscription fees and
            credit costs are displayed in your dashboard before purchase. By subscribing or
            purchasing credits, you authorize us (or our payment processor) to charge the payment
            method you provide. All fees are non-refundable except as required by law or
            explicitly stated in writing by us.
          </p>
          <ul>
            <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
            <li>Credits do not expire unless stated otherwise in your plan.</li>
            <li>Failed charges may result in suspension of your account until resolved.</li>
          </ul>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Generate, distribute, or publish unlawful, harmful, defamatory, or misleading content;</li>
            <li>Send unsolicited bulk messages, spam, or content that violates anti-spam laws (including CAN-SPAM, CASL, or GDPR);</li>
            <li>Infringe on intellectual property, privacy, or publicity rights of any party;</li>
            <li>Reverse engineer, decompile, or attempt to extract source code from the Service;</li>
            <li>Use the Service to train competing AI models;</li>
            <li>Bypass usage limits, credit systems, or abuse the API.</li>
          </ul>

          <h2>6. Content Ownership</h2>
          <p>
            <strong>Your Content.</strong> You retain ownership of any content, data, or materials
            you upload to the Service ("User Content"). By submitting User Content, you grant us a
            limited, worldwide, non-exclusive, royalty-free license to host, store, process, and
            display such content solely to provide and improve the Service.
          </p>
          <p>
            <strong>AI-Generated Output.</strong> Content generated by our AI features (articles,
            keywords, images, videos) is provided to you to use as you see fit, subject to these
            Terms. You are responsible for reviewing AI-generated output for accuracy and ensuring
            it complies with applicable laws before publishing or distributing it.
          </p>

          <h2>7. Third-Party Services</h2>
          <p>
            The Service may integrate with third-party platforms (e.g., social networks,
            WordPress, Stripe, OpenAI, SpyFu). Your use of those services is governed by their
            own terms and privacy policies. We are not responsible for the availability,
            accuracy, or content of third-party services.
          </p>

          <h2>8. Intellectual Property</h2>
          <p>
            All rights, title, and interest in the Service, including its software, design,
            trademarks, and documentation, are owned by {appName} or its licensors. These Terms
            do not grant you any rights to our trademarks, logos, or trade dress.
          </p>

          <h2>9. Termination</h2>
          <p>
            You may terminate your account at any time from your dashboard settings. We may
            suspend or terminate your access if you violate these Terms, fail to pay fees, or
            engage in activity that harms the Service or other users. Upon termination, your
            right to use the Service ends immediately. We may retain certain data as required
            by law or for legitimate business purposes.
          </p>

          <h2>10. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            either express or implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, or non-infringement. We do not warrant that the
            Service will be uninterrupted, error-free, or free of harmful components.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, {appName} and its affiliates shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages, or
            any loss of profits, revenue, data, or use, arising out of or related to your use of
            the Service. Our total liability for any claim under these Terms shall not exceed the
            amount you paid us in the twelve months preceding the claim.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless {appName}, its officers, employees, and
            affiliates from any claims, damages, losses, or expenses (including reasonable
            attorneys' fees) arising out of your User Content, your violation of these Terms, or
            your misuse of the Service.
          </p>

          <h2>13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we will
            notify you by email or through the Service. Continued use of the Service after the
            updated Terms take effect constitutes your acceptance of the changes.
          </p>

          <h2>14. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the
            jurisdiction in which {appName} is established, without regard to its conflict of law
            principles. Any disputes shall be resolved exclusively in the courts of that
            jurisdiction.
          </p>

          <h2>15. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a href={`mailto:support@${domain}`} className="text-[#bd711d] hover:underline">
              support@{domain}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
