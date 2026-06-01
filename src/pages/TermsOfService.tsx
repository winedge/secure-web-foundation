import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "June 1, 2026";
const COMPANY = "LeadThru";
const CONTACT_EMAIL = "legal@leadthru.app";
const GOVERNING_LAW = "the State of Delaware, United States";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Terms of Service | {COMPANY}</title>
        <meta
          name="description"
          content={`${COMPANY} Terms of Service governing use of our lead generation and case management platform, including subscription, payment, and acceptable use rules.`}
        />
        <link rel="canonical" href="https://snuggle-site-synth.lovable.app/terms" />
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
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>

        <section className="space-y-8">
          <p className="text-base leading-relaxed text-muted-foreground">
            These Terms of Service ("Terms") form a binding agreement between you ("Customer", "you") and {COMPANY}
            ("we", "us"). By creating an account, accessing, or using the {COMPANY} platform (the "Service") you
            agree to these Terms. If you do not agree, do not use the Service.
          </p>

          <Section title="1. Eligibility &amp; Account">
            <p>You must be at least 18 years old and legally able to enter into contracts. You are responsible for maintaining the confidentiality of your credentials, enabling multi-factor authentication, and for all activity under your account.</p>
          </Section>

          <Section title="2. Description of the Service">
            <p>{COMPANY} provides a SaaS platform for law firms and marketing teams, including: lead intake forms, a lead marketplace, AI-assisted case evaluation, advertising campaign management (Meta Ads, Google Ads, GMB), CRM integrations, e-signature workflows, and analytics. Features may change over time.</p>
          </Section>

          <Section title="3. Subscription Plans &amp; Wallet">
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Basic:</strong> $99 USD per month.</li>
              <li><strong>Premium:</strong> $249 USD per month.</li>
              <li><strong>Wallet:</strong> prepaid balance used to purchase leads and clear pipeline gates ($50 for Call Verified, $200 for Documents Retrieved).</li>
              <li>Subscriptions auto-renew until cancelled. You may cancel any time; cancellation takes effect at the end of the current billing period.</li>
              <li>Fees are non-refundable except where required by law.</li>
              <li>Wallet balances are non-refundable but do not expire while your account is active.</li>
            </ul>
          </Section>

          <Section title="4. Payment Terms">
            <p>Payments are processed by Stripe. You authorize us to charge your payment method for all fees, including applicable taxes. If a charge fails we may suspend the Service until paid.</p>
          </Section>

          <Section title="5. Lead Marketplace Rules">
            <ul className="list-disc pl-6 space-y-1">
              <li>Leads are licensed to a single firm at the time of purchase using row-level locking; once purchased, a lead is exclusive unless re-listed.</li>
              <li>Contact information remains masked until you clear the Call Verification gate.</li>
              <li>You may not resell, redistribute, or scrape leads outside of authorized CRM exports.</li>
              <li>Refunds for fraudulent or duplicate leads are governed by our Lead Quality Policy and require submission within 7 days of purchase.</li>
            </ul>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service to violate any law, including TCPA, CAN-SPAM, GDPR, HIPAA, or attorney advertising rules (ABA Model Rules 7.1-7.5).</li>
              <li>Send unsolicited communications or spam.</li>
              <li>Reverse engineer, decompile, or attempt to bypass security controls (RLS, MFA, encryption, fraud scoring).</li>
              <li>Upload malware, infringing content, or content that violates third-party rights.</li>
              <li>Use the Service to compete with {COMPANY} or to build a competing product.</li>
            </ul>
          </Section>

          <Section title="7. AI Features &amp; Transparency">
            <p>AI-generated outputs are provided as decision support, not legal advice. You are responsible for reviewing AI suggestions before acting on them. We log AI decisions in our transparency ledger and display compliance badges as required by the EU AI Act.</p>
          </Section>

          <Section title="8. Third-Party Integrations">
            <p>Connections to Meta, Google, Stripe, and other providers are governed by their own terms. We are not responsible for the availability or behavior of third-party services.</p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>The Service, including all software, design, trademarks, and documentation, is owned by {COMPANY} and licensed, not sold, to you. You retain ownership of your firm and lead data. By using the Service you grant us a limited license to host, process, and display your content solely to provide the Service.</p>
          </Section>

          <Section title="10. Confidentiality">
            <p>Each party will protect the other's confidential information with at least the same degree of care it uses for its own, and not less than reasonable care.</p>
          </Section>

          <Section title="11. Disclaimers">
            <p className="uppercase text-sm tracking-wide">The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that leads will result in retained clients.</p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p className="uppercase text-sm tracking-wide">To the maximum extent permitted by law, {COMPANY}'s aggregate liability arising out of or related to these Terms will not exceed the greater of (a) the fees you paid to us in the 12 months preceding the claim, or (b) USD $100. We will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or lost profits or data.</p>
          </Section>

          <Section title="13. Indemnification">
            <p>You will defend, indemnify, and hold harmless {COMPANY} from any third-party claims arising out of your use of the Service, your content, or your breach of these Terms.</p>
          </Section>

          <Section title="14. Suspension &amp; Termination">
            <p>We may suspend or terminate your access immediately if you breach these Terms, fail to pay, or pose a security or legal risk. On termination, your right to use the Service ends; we will make your data available for export for 30 days, after which it may be deleted.</p>
          </Section>

          <Section title="15. Governing Law &amp; Dispute Resolution">
            <p>These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-law rules. Any dispute will be resolved by binding arbitration administered by JAMS in Wilmington, Delaware, except that either party may seek injunctive relief in court for intellectual property or confidentiality matters. <strong>You waive any right to participate in a class action.</strong></p>
          </Section>

          <Section title="16. Changes to the Terms">
            <p>We may update these Terms; material changes will be notified at least 30 days in advance via email or in-app banner. Continued use after the effective date constitutes acceptance.</p>
          </Section>

          <Section title="17. Miscellaneous">
            <p>These Terms, together with our Privacy Policy and any order form, constitute the entire agreement. If any provision is held unenforceable, the remainder will remain in effect. We may assign these Terms in connection with a merger or sale; you may not assign without our consent. No waiver is effective unless in writing.</p>
          </Section>

          <Section title="18. Contact">
            <p>
              {COMPANY} Legal<br />
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

export default TermsOfService;
