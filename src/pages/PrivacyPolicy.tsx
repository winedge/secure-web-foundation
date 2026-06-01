import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "June 1, 2026";
const COMPANY = "LeadThru";
const CONTACT_EMAIL = "privacy@leadthru.app";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Privacy Policy | {COMPANY}</title>
        <meta
          name="description"
          content={`${COMPANY} Privacy Policy | how we collect, use, store, and protect your personal information in compliance with GDPR, CCPA, and the EU AI Act.`}
        />
        <link rel="canonical" href="https://snuggle-site-synth.lovable.app/privacy" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-primary">
            {COMPANY}
          </Link>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>

        <section className="prose prose-slate max-w-none space-y-8 dark:prose-invert">
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              {COMPANY} ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, store, and safeguard your information when you use our
              lead generation, marketing automation, and case management platform (the "Service"). By using the
              Service you agree to the practices described here.
            </p>
          </div>

          <Section title="1. Information We Collect">
            <p><strong>Account &amp; Profile Data:</strong> name, email address, phone number, firm name, billing address, role, and authentication credentials (passwords are hashed; biometric Passkeys are stored as public keys only).</p>
            <p><strong>Lead &amp; Claimant Data:</strong> contact details, case descriptions, intake form responses, documents you upload, and communications you exchange through the Service. This data is encrypted at rest using AES-256-GCM with quantum-resistant ML-KEM-1024 envelope keys.</p>
            <p><strong>Usage &amp; Device Data:</strong> IP address, browser type, operating system, pages viewed, referrer URLs, session recordings (rrweb), and diagnostic logs.</p>
            <p><strong>Payment Data:</strong> processed by Stripe; we receive transaction metadata but do not store full card numbers.</p>
            <p><strong>Third-Party Integration Data:</strong> tokens and metadata from connected accounts (Meta Ads, Google Ads, Google My Business, CRMs) used only for the scopes you authorize.</p>
            <p><strong>AI Inputs &amp; Outputs:</strong> prompts and generated content; logged in our AI transparency ledger as required by the EU AI Act.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, operate, and improve the Service.</li>
              <li>Match leads to law firms and process marketplace purchases.</li>
              <li>Authenticate users, enforce MFA, and detect fraud.</li>
              <li>Process payments, wallet funding, and subscriptions.</li>
              <li>Send transactional emails (receipts, alerts, security notices).</li>
              <li>Send marketing communications (only with your opt-in; unsubscribe any time).</li>
              <li>Comply with legal obligations, including ABA Model Rule 5.12 and GDPR.</li>
              <li>Generate aggregated, de-identified analytics.</li>
            </ul>
          </Section>

          <Section title="3. Legal Bases for Processing (GDPR)">
            <p>We process personal data on the following bases: (a) performance of a contract; (b) your consent; (c) compliance with legal obligations; (d) our legitimate interests in operating and securing the Service, balanced against your rights.</p>
          </Section>

          <Section title="4. How We Share Information">
            <p>We do not sell personal information. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Subscribed law firms</strong> who purchase a matched lead through the marketplace, after applicable verification gates are cleared.</li>
              <li><strong>Service providers</strong> (cloud hosting, payment processing, email delivery, analytics) under written data processing agreements.</li>
              <li><strong>Authorities</strong> when required by law, subpoena, or to protect rights, safety, and property.</li>
              <li><strong>Successors</strong> in connection with a merger, acquisition, or asset sale (with notice).</li>
            </ul>
          </Section>

          <Section title="5. Zero-Knowledge Encryption">
            <p>Personally identifiable information (PII) attached to leads is encrypted client-side before transmission. We cannot read this data without your master passphrase or recovery codes. Recovery codes are stored as SHA-256 hashes; we cannot recover them on your behalf.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain account data for the life of your account plus 30 days after closure. Lead data is retained according to your firm's matter-retention policy (default 7 years to satisfy legal hold requirements). Session recordings are retained 90 days unless legal hold applies. You may request earlier deletion under Section 8.</p>
          </Section>

          <Section title="7. International Data Transfers">
            <p>Data may be processed in the United States and the European Union. Where data leaves the EEA/UK we rely on Standard Contractual Clauses and additional technical safeguards (encryption, pseudonymization).</p>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your jurisdiction (GDPR, UK GDPR, CCPA/CPRA, PIPEDA, LGPD) you may have the right to: access, correct, delete, port, restrict, or object to processing of your personal data, and to withdraw consent. California residents may also opt out of "sharing" for cross-context behavioral advertising. To exercise these rights, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>. We respond within 30 days.</p>
          </Section>

          <Section title="9. Cookies &amp; Tracking">
            <p>We use strictly-necessary cookies for authentication and CSRF protection, and analytics cookies (PostHog) only with your consent. You can manage preferences in your browser settings.</p>
          </Section>

          <Section title="10. Security">
            <p>We employ AES-256-GCM encryption at rest, TLS 1.3 in transit, MFA (TOTP and WebAuthn Passkeys), role-based access control with Row Level Security, fraud detection scoring, blockchain-style lead chain-of-custody hashing, and 24/7 monitoring. No system is 100% secure; we will notify affected users of any qualifying breach within 72 hours.</p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>The Service is not directed to children under 16 and we do not knowingly collect their personal information.</p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>We may update this policy from time to time. Material changes will be notified via email or in-app banner at least 30 days before they take effect.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              Data Protection Officer<br />
              {COMPANY}<br />
              Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>
            </p>
          </Section>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY}. ABA 5.12 / GDPR / EU AI Act compliant.
        </div>
      </footer>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
    <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export default PrivacyPolicy;
