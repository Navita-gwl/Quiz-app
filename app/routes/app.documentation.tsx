import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncSubscription } from "../billing.server";
import { checkFeatureAccess } from "../feature";
import { buildQuizBlockThemeEditorUrl } from "../utils/themeEditorDeepLink.server";
import { ThemeEditorLink } from "../components/ThemeEditorLink";
import {
  BookOpen,
  Sparkles,
  HelpCircle,
  Layers,
  Sliders,
  UserCheck,
  UploadCloud,
  ListTodo,
  Lock,
  ArrowRight,
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  let hasHydrogenAccess = false;
  if (shop) {
    const currentPlan = await syncSubscription(admin, shop);
    hasHydrogenAccess = checkFeatureAccess(currentPlan, "hydrogen");
  }

  return {
    hasHydrogenAccess,
    addQuizBlockUrl: buildQuizBlockThemeEditorUrl(shop),
  };
};

export default function DocumentationPage() {
  const { hasHydrogenAccess, addQuizBlockUrl } = useLoaderData<typeof loader>();

  const steps = [
    {
      num: 1,
      icon: <HelpCircle className="w-4 h-4 text-indigo-600" />,
      title: "Create Quiz Container",
      description: "First, set up a container to hold your quiz questions and logic:",
      details: [
        <span>Navigate to the <Link to="/app/questions" className="text-brand-600 hover:text-brand-700 font-bold underline">Quiz Builder</Link> page.</span>,
        "Click on the Create Quiz button.",
        "Enter a public title (e.g. \"Skin Care Finder\" or \"Coffee Roast Matcher\") and save.",
        "Copy the 8-character Quiz ID from the dashboard list."
      ]
    },
    {
      num: 2,
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      title: "Add Questions & Options",
      description: "Build the interactive step-by-step screens that ask customers their preferences:",
      details: [
        "Select your quiz container from the Questions list.",
        "Click Add Question to add a step.",
        "Set option layout styles (stacked, bordered cards, or image grid layouts).",
        "Add option labels and choose visual images where applicable."
      ]
    },
    {
      num: 3,
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      title: "Map Product Recommendations",
      description: "Ensure that customers are recommended matching products based on their answers:",
      details: [
        "In the question option editor, click the collections lookup selector.",
        "Select a Shopify collection to attach to this choice.",
        "When this option is picked, items from this collection are added to the recommendations list.",
        "Matches are computed and displayed to the shopper upon quiz completion."
      ]
    },
    {
      num: 4,
      icon: <Sliders className="w-4 h-4 text-indigo-600" />,
      title: "Customize Quiz Design",
      description: "Tweak colors, styling, text, and settings to match your branding:",
      details: [
        <span>Go to the <Link to="/app/settings" className="text-brand-600 hover:text-brand-700 font-bold underline">Settings</Link> page.</span>,
        "Update backgrounds, text colors, and submit button colors.",
        "Adjust border radius sizes for option elements and containers.",
        "Translate completed headings, start button text, and subtext labels."
      ]
    },
    {
      num: 5,
      icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
      title: "Configure Lead Capture",
      description: "Build your customer email marketing database directly inside the quiz flow:",
      details: [
        "In Settings, activate Name and Email fields.",
        "Choose whether to request contact info before the quiz starts, or right before results load.",
        "Save settings to apply fields instantly."
      ]
    },
    {
      num: 6,
      icon: <UploadCloud className="w-4 h-4 text-indigo-600" />,
      title: "Publish to Shopify Theme",
      description: "Embed the quiz directly onto your storefront without writing custom Liquid code:",
      details: [
        "Use the button below to open the Theme Editor with the QuizInsights Quiz block ready to add.",
        "Choose the page template (home page opens by default) and place the block where you want the quiz to appear.",
        "Paste your 8-character Quiz ID from the dashboard into the block settings and save the theme.",
      ]
    },
    {
      num: 7,
      icon: <ListTodo className="w-4 h-4 text-indigo-600" />,
      title: "Analyze & Export Responses",
      description: "View compiled customer answers and leads in the dashboard:",
      details: [
        <span>Check leads inside the <Link to="/app/responses" className="text-brand-600 hover:text-brand-700 font-bold underline">Responses</Link> list.</span>,
        "View customer name, email address, time of quiz, and total answers.",
        "Click View Details to inspect choice mappings and recommended products."
      ]
    },
    ...(hasHydrogenAccess
      ? [{
          num: 8,
          icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
          title: "Hydrogen / Headless API Integration",
          description: "Integrate matching workflows into custom headless React or Hydrogen storefronts.",
          details: [
            "Use the public quiz API to fetch questions and settings for a specific Quiz ID and shop domain.",
            "Build your own quiz UI in a headless React, Next.js, or Hydrogen storefront using the returned question and settings payload.",
            "Submit customer answers to the public submit endpoint along with the Quiz ID and shop identifier.",
            "Use the returned recommendation payload to render matching products on your completion screen.",
            <span key="settings">Open <Link to="/app/settings" className="text-brand-600 hover:text-brand-700 font-bold underline">Settings</Link> to find Hydrogen / Headless embed URLs, iframe snippets, and the public API endpoints for your shop.</span>,
          ],
        }]
      : [{
          num: 8,
          icon: <Lock className="w-4 h-4 text-slate-450" />,
          title: "Hydrogen / Headless API Integration",
          description: "Integrate matching workflows into custom headless React or Hydrogen storefronts.",
          details: [
            <span key="upgrade">Headless React, Next.js, and Hydrogen API routes are available on the Starter plan. <Link to="/app/pricing" className="text-brand-600 hover:text-brand-700 font-bold underline">Upgrade Plan</Link></span>,
          ],
          locked: true,
        }]),
  ];

  return (
    <s-page heading="Documentation">
      <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">

        {/* Top Header Card */}
        <div className="mb-8 pt-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" /> Documentation & Setup Guide
          </h1>
          <p className="text-sm text-slate-500 mt-1">Everything you need to build, style, publish, and integrate quizzes on your store.</p>
        </div>

        {/* Steps Grid */}
        <div className="space-y-6 max-w-4xl">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex gap-4 hover:border-slate-200 transition-colors ${(step as any).locked ? "opacity-90" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${(step as any).locked ? "bg-slate-100" : "bg-indigo-50"}`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-bold flex items-center gap-2 flex-wrap ${(step as any).locked ? "text-slate-400" : "text-slate-800"}`}>
                  <span className={`text-base font-bold ${(step as any).locked ? "text-slate-400" : "text-indigo-600"}`}>Step {step.num}:</span> {step.title}
                  {(step as any).locked && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      Premium Feature
                    </span>
                  )}
                </h3>
                <p className="text-slate-550 text-[13.5px] mt-1.5 leading-relaxed">{step.description}</p>
                <ul className="mt-3.5 space-y-2">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-600 font-medium">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                {step.num === 6 && addQuizBlockUrl ? (
                  <ThemeEditorLink
                    url={addQuizBlockUrl}
                    openInNewTab
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    Add Quiz block in Theme Editor <ArrowRight className="w-3.5 h-3.5" />
                  </ThemeEditorLink>
                ) : null}
              </div>
            </div>
          ))}

        </div>

      </div>
    </s-page>
  );
}
