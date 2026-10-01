import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import PublicLayout from "../../components/PublicLayout";
import { getShopPlan } from "../../billing.server";
import { checkFeatureAccess } from "../../feature";
import { getAppUrl } from "../../utils/appUrl.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Getting Started Guide - QuizInsights" },
    { name: "description", content: "Learn how to build, customize, and publish quizzes with QuizInsights on Shopify." },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  let hasHydrogenAccess = false;
  if (shop) {
    const currentPlan = await getShopPlan(shop);
    hasHydrogenAccess = checkFeatureAccess(currentPlan, "hydrogen");
  }

  return {
    appUrl: getAppUrl(request) || "https://your-app-domain.com",
    hasHydrogenAccess,
  };
};

export default function GettingStartedRoute() {
  const { appUrl, hasHydrogenAccess } = useLoaderData<typeof loader>();

  return (
    <PublicLayout>
      <div className="space-y-10 text-slate-800">
        {/* Title */}
        <header className="border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Getting Started Guide
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Follow these steps to set up, customize, and publish your first storefront quiz.
          </p>
        </header>

        {/* Step 1 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">1. Create Quiz</h2>
          <p className="leading-relaxed">
            Create a quiz container to organize your customer questions:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to the <strong>Questions</strong> page in the app dashboard.</li>
            <li>Click the <strong>Create Quiz</strong> button.</li>
            <li>Type in a name for your quiz (like <i>"Gift Finder"</i> or <i>"Style Matcher"</i>) and save it.</li>
            <li>Note the 8-character <strong>Quiz ID</strong> shown next to the name. You will need this ID to publish the quiz.</li>
          </ul>
        </section>

        {/* Step 2 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">2. Add Questions</h2>
          <p className="leading-relaxed">
            Build the list of questions you want to ask customers:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Select your quiz from the list in the <strong>Questions</strong> tab.</li>
            <li>Click <strong>Add Question</strong>.</li>
            <li>Type in your question text and select whether options display as lists, grids, or with images.</li>
            <li>Create answer choices. Use the drag-and-drop handles to rearrange the order of questions.</li>
          </ul>
        </section>

        {/* Step 3 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">3. Configure Product Recommendations</h2>
          <p className="leading-relaxed">
            Attach collection recommendations to answer choices:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>When editing answer options under a question, select a Shopify Collection from the product selection dropdown.</li>
            <li>When customers click that answer option, the quiz compiles products from the linked collection.</li>
            <li>At the end of the quiz, all compiled products are recommended to the customer.</li>
          </ul>
        </section>

        {/* Step 4 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">4. Customize Quiz Design</h2>
          <p className="leading-relaxed">
            Style the quiz to match your Shopify store design:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open the <strong>Settings</strong> tab in the app admin.</li>
            <li>Adjust button colors, card border radiuses, backgrounds, and progress bar layouts.</li>
            <li>Use the Text Customization fields to translate or change button labels.</li>
            <li>Write custom rules in the Custom CSS box to overwrite any default spacing or element styles.</li>
          </ul>
        </section>

        {/* Step 5 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">5. Lead Collection</h2>
          <p className="leading-relaxed">
            Collect customer emails before displaying matched products:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to the <strong>Settings</strong> tab.</li>
            <li>Enable the Name and Email fields for customer lead capture.</li>
            <li>Choose whether to ask for this contact info before starting the quiz, or right before showing results.</li>
          </ul>
        </section>

        {/* Step 6 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">6. Publish via Theme Extension</h2>
          <p className="leading-relaxed">
            Add the quiz to your Liquid theme without writing theme code:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to Shopify Admin &gt; <strong>Online Store</strong> &gt; <strong>Themes</strong> &gt; <strong>Customize</strong>.</li>
            <li>Choose the page template where you want to embed the quiz (like a dedicated page or homepage).</li>
            <li>In the left editor sidebar, click <strong>Add Section</strong> or <strong>Add Block</strong> and choose the <strong>Quiz</strong> block from QuizInsights.</li>
            <li>Paste your 8-character <strong>Quiz ID</strong> in the block settings in the sidebar.</li>
            <li>Save your theme changes.</li>
          </ul>
        </section>

        {/* Step 7 */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">7. View Responses</h2>
          <p className="leading-relaxed">
            Access collected customer leads and answers:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open the <strong>Responses</strong> tab in the app admin.</li>
            <li>View customer names, emails, and quiz completion dates.</li>
            <li>Click <strong>View</strong> to check the exact answers a customer clicked for every question in the quiz.</li>
          </ul>
        </section>

        {/* Step 8 */}
        {hasHydrogenAccess && (
          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-xl font-bold text-slate-900">8. Hydrogen / Headless Integration</h2>
            <p className="leading-relaxed">
              Integrate quizzes into headless Shopify storefronts:
            </p>

            <div className="space-y-4 mt-2">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">Option A: iFrame Embed</h3>
                <p className="text-slate-600 text-xs mb-2">Embed the pre-built quiz view in your page component:</p>
                <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs overflow-x-auto font-mono text-slate-700">
  {`<iframe 
    src="${appUrl}/embed/quiz?shop=[YOUR_SHOP_DOMAIN]&quizId=[QUIZ_ID]" 
    width="100%" 
    height="600" 
    style={{ border: "none" }}
  />`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">Option B: JSON API</h3>
                <p className="text-slate-600 text-xs mb-2">Fetch raw quiz details to build your own custom React UI:</p>
                <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs overflow-x-auto font-mono text-slate-700">
  {`// Fetch quiz questions
  GET ${appUrl}/api/public/quiz?shop=[YOUR_SHOP_DOMAIN]&quizId=[QUIZ_ID]
  
  // Submit customer details and answers
  POST ${appUrl}/api/public/submit`}
                </pre>
              </div>
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
