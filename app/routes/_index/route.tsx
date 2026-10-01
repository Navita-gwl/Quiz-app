import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect, Form, useLoaderData, Link } from "react-router";
import { Sparkles, Layers, MessageSquare, Puzzle, ArrowRight } from "lucide-react";

import { login } from "../../shopify.server";

export const meta: MetaFunction = () => {
  return [
    { title: "QuizInsights — Product discovery quizzes for Shopify" },
    {
      name: "description",
      content:
        "Create storefront quizzes, capture qualified leads, and recommend the right products to every shopper.",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

const features = [
  {
    icon: Layers,
    title: "Interactive quizzes",
    description:
      "Build questions with image or text options and map answers to Shopify products for smart product recommendations.",
  },
  {
    icon: MessageSquare,
    title: "Lead capture",
    description:
      "Collect customer name and email before or after the quiz, then review every submission in your admin dashboard.",
  },
  {
    icon: Puzzle,
    title: "Theme app extension",
    description:
      "Add the quiz block from the Shopify Theme Editor—no manual theme code changes required.",
  },
];

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {/* Header + hero — open layout, no bordered card */}
      <div className="relative overflow-hidden border-b border-slate-100">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[min(100%,48rem)] h-64 bg-gradient-to-b from-indigo-50/80 via-brand-50/30 to-transparent rounded-full blur-3xl opacity-70" />
        </div>

        <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-bold text-slate-900 tracking-tight text-lg">QuizInsights</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/help/faq" className="text-slate-500 hover:text-slate-900 transition-colors">
              FAQ
            </Link>
            <Link to="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors">
              Privacy
            </Link>
          </nav>
        </header>

        <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-14 md:pt-10 md:pb-20 text-center">
          <h1 className="text-[2rem] sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-5 text-balance">
            Power product discovery with personalized quizzes
          </h1>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto text-pretty">
            Create engaging storefront quizzes, collect qualified leads, and recommend
            the exact products your customers are looking for.
          </p>
        </section>
      </div>

      <main className="flex-grow px-4 sm:px-6 py-10 md:py-14 bg-slate-50/50">
        <div className="max-w-5xl mx-auto space-y-10 md:space-y-14">
          {/* Login */}
          {showForm && (
            <section className="max-w-md mx-auto w-full">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Log in to your store</h2>
                <p className="text-sm text-slate-500 mb-5">
                  Enter your Shopify domain to open the app in admin.
                </p>
                <Form method="post" action="/auth/login" className="space-y-4">
                  <label className="block space-y-1.5 text-left">
                    <span className="text-sm font-medium text-slate-700">Shop domain</span>
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-shadow"
                      type="text"
                      name="shop"
                      placeholder="my-store.myshopify.com"
                      autoComplete="on"
                    />
                    <span className="text-xs text-slate-400">e.g. my-store.myshopify.com</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow transition-all duration-200"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Form>
              </div>
            </section>
          )}

          {/* Features */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
              </article>
            ))}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} QuizInsights. All rights reserved.</span>
          <a
            href="mailto:appsupport@galaxyweblinks.com"
            className="text-slate-600 hover:text-brand-600 font-medium transition-colors"
          >
            appsupport@galaxyweblinks.com
          </a>
        </div>
      </footer>
    </div>
  );
};
