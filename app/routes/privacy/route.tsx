import type { MetaFunction } from "react-router";
import PublicLayout from "../../components/PublicLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - QuizInsights" },
    { name: "description", content: "Privacy policy for the QuizInsights App in accordance with Shopify App Store and global data protection guidelines." },
  ];
};

export default function PrivacyRoute() {
  return (
    <PublicLayout hideSupportEmail>
      <div className="space-y-8 text-slate-800 font-sans">
        <header className="border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
        </header>

        <p className="leading-relaxed">
          This document details the privacy practices of Galaxy Weblinks Ltd regarding the collection, processing, and protection of personal data when using the QuizInsights application (the &quot;App&quot;) installed on a Shopify store.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
          <p className="leading-relaxed">
            QuizInsights provides interactive storefront quizzes that help shoppers discover products. When you install the App, it stores quiz content, shopper responses, optional lead details, and product recommendation results configured by the merchant.
          </p>
          <p className="leading-relaxed">
            We are committed to maintaining the confidentiality of merchant and buyer records. This notice outlines our handling methods to meet Shopify developer guidelines and global regulations such as GDPR and UK GDPR.
          </p>
          <p className="leading-relaxed text-sm text-slate-500 italic">
            This page is provided for informational purposes and does not constitute legal advice. If you have questions about how privacy laws apply to your business, please consult a qualified legal professional.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Who This Policy Applies To</h2>
          <p className="leading-relaxed">We process data relating to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Merchants who install QuizInsights on their Shopify store.</li>
            <li>Authorized store staff who configure quizzes and review submissions in the admin app.</li>
            <li>Shoppers who complete quizzes, submit optional contact details, or view product recommendations on the merchant&apos;s storefront.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Information We Collect Through Shopify</h2>
          <p className="leading-relaxed">
            With the merchant&apos;s consent during installation, the App uses Shopify APIs and session data to operate. This includes:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Store identity and session information required for secure admin access.</li>
            <li>Product and collection data (names, IDs, and images) used to build quiz recommendations.</li>
            <li>App subscription and billing status processed through Shopify&apos;s billing system.</li>
            <li>Images uploaded by merchants through the admin, stored via Shopify&apos;s file hosting where applicable.</li>
          </ul>
          <p className="leading-relaxed">
            The App requests the following Shopify access scopes:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>read_products</strong> — to load product and collection details used in quiz recommendations and the quiz builder.</li>
            <li><strong>write_files</strong> — to upload images merchants attach to quiz answer options, stored through Shopify&apos;s file hosting APIs.</li>
          </ul>
          <p className="leading-relaxed">
            We do not request access to orders, payments, Shopify customer account records beyond what shoppers submit through the quiz, or other Shopify data outside what is needed to run QuizInsights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Information We Collect Directly From Merchants</h2>
          <p className="leading-relaxed">
            We retain settings and content you configure in the QuizInsights admin, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Quiz titles, questions, answer options, and product or collection mappings.</li>
            <li>Design and display settings such as colors, layout options, and optional custom CSS or JavaScript on eligible plans.</li>
            <li>Quiz submissions and lead details collected from shoppers, visible in the Responses area of the app.</li>
            <li>Technical logs used to diagnose errors and maintain service reliability.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Information We Collect From Merchants&apos; Customers</h2>
          <p className="leading-relaxed">
            When a shopper completes a quiz on a merchant&apos;s storefront, we may store:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Answers selected during the quiz session.</li>
            <li>Name and email address when the merchant has enabled lead capture.</li>
            <li>Product recommendations generated from the shopper&apos;s answers.</li>
            <li>An optional Shopify customer ID when available from the logged-in storefront session.</li>
          </ul>
          <p className="leading-relaxed">
            Shopper contact details are used for lead generation and for the merchant to review submissions inside QuizInsights. The App does not use third-party advertising cookies or marketing pixels on customer devices. The storefront quiz may use browser <strong>local storage</strong> on the shopper&apos;s device to restore an in-progress or completed quiz session; this data stays on the device and is not used for cross-site tracking.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. How We Use Information</h2>
          <p className="leading-relaxed">
            We use collected information to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Display quizzes and product recommendations on the merchant&apos;s storefront.</li>
            <li>Store and display quiz submissions to the merchant in the admin app.</li>
            <li>Authenticate merchant access and manage app subscriptions.</li>
            <li>Provide optional headless or iframe embed functionality on eligible plans.</li>
            <li>Maintain security, prevent abuse, and troubleshoot technical issues.</li>
          </ul>
          <p className="leading-relaxed">
            We do not sell personal data or use merchant or shopper data to advertise third-party services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">7. Legal Basis for Processing (EEA/UK)</h2>
          <p className="leading-relaxed">
            Where GDPR or UK GDPR applies, we rely on:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract</strong> — To provide QuizInsights to the merchant.</li>
            <li><strong>Legitimate interests</strong> — To secure, maintain, and improve the App.</li>
            <li><strong>Legal obligation</strong> — To comply with applicable law and Shopify requirements.</li>
            <li><strong>Consent</strong> — Where a shopper chooses to submit contact details through a quiz form.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">8. Data Sharing and Processors</h2>
          <p className="leading-relaxed">
            We use infrastructure providers such as cloud hosting and database services to operate QuizInsights. These providers process data on our behalf under appropriate safeguards and may not use the data for their own marketing purposes.
          </p>
          <p className="leading-relaxed">
            We may disclose information if required by law or to protect the rights, safety, and security of users and our services.
          </p>
          <p className="leading-relaxed">
            Shopify processes store and checkout data under its own privacy policies. Merchants should also refer to Shopify&apos;s documentation on mandatory compliance webhooks and data subject requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">9. International Data Transfers</h2>
          <p className="leading-relaxed">
            Information processed by QuizInsights may be stored or processed in countries outside the shopper&apos;s or merchant&apos;s home jurisdiction. Where required, we use appropriate safeguards for cross-border transfers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">10. Data Retention</h2>
          <p className="leading-relaxed">
            We retain personal information only as long as needed for the purposes described above:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Merchant quiz configuration and submissions are kept while the App remains installed and in use.</li>
            <li>Customer quiz data may be anonymized when Shopify sends a redaction request or after uninstall, as described in section 11.</li>
            <li>After uninstall, Shopify sends a <strong>shop/redact</strong> webhook approximately 48 hours later. We anonymize shopper personal data in quiz submissions at that time. Merchant-created quiz content (titles, questions, design settings) may remain stored without shopper names, emails, or recommendation payloads until manually purged or a later deletion process, because it does not identify individual customers.</li>
            <li>Server logs are retained for a limited period for security and troubleshooting.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">11. Data Subject Rights and GDPR Webhooks</h2>
          <p className="leading-relaxed">
            Depending on applicable law, individuals may request access to, correction of, or deletion of personal data. QuizInsights supports Shopify&apos;s mandatory compliance webhooks:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>customers/data_request</strong> — Locates quiz submissions and answers linked to the customer. Merchants view and export those records in the QuizInsights <strong>Responses</strong> admin page (search by the customer&apos;s email or use the CSV export).</li>
            <li><strong>customers/redact</strong> — Anonymizes personal identifying details in quiz records upon request.</li>
            <li><strong>shop/redact</strong> — Sent by Shopify about 48 hours after uninstall. We anonymize shopper personal data in all quiz submissions for that store (names, email addresses, and stored recommendation results) and remove customer IDs linked to answers. Merchant quiz configuration—quiz containers, questions, answer options, and app settings—may be retained because it is merchant-authored content and, after anonymization, no longer contains identifiable customer information.</li>
          </ul>
          <p className="leading-relaxed text-sm">
            Merchants are responsible for responding to their customers&apos; privacy requests. If you need help locating customer quiz data before redaction, use the Responses page or contact us. If you require complete deletion of all stored app data for your shop, contact us at{" "}
            <a href="mailto:appsupport@galaxyweblinks.com" className="text-indigo-600 hover:text-indigo-800 underline font-medium">
              appsupport@galaxyweblinks.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">12. Security</h2>
          <p className="leading-relaxed">
            We use HTTPS, access controls, and other reasonable technical and organizational measures to protect data. No method of transmission or storage is completely secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">13. Children&apos;s Privacy</h2>
          <p className="leading-relaxed">
            QuizInsights is intended for business use by merchants and is not directed at children. If we learn that personal information from a child was collected without appropriate authorization, we will take steps to delete or anonymize it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">14. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this privacy policy from time to time. Changes will be posted on this page with an updated date. Continued use of QuizInsights after an update constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-bold text-slate-900">15. Contact Us</h2>
          <p className="leading-relaxed">
            If you have questions about this policy or QuizInsights data practices, contact us at:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 text-sm">
            <p><strong>App:</strong> QuizInsights</p>
            <p><strong>Company:</strong> Galaxy Weblinks Ltd</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:appsupport@galaxyweblinks.com" className="text-indigo-600 hover:text-indigo-800 underline font-medium">
                appsupport@galaxyweblinks.com
              </a>
            </p>
            <p>
              <strong>Website:</strong>{" "}
              <a href="https://www.galaxyweblinks.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-medium">
                https://www.galaxyweblinks.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
