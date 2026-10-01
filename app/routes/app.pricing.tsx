import { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { Check, X, Sparkles, Star, FlaskConical, ExternalLink } from "lucide-react";
import { getBillingStatus, getPlanSelectionUrl } from "../billing.server";

export const STARTER_TRIAL_DAYS = 7;

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    trialDays: 0,
  },
  STARTER: {
    name: "Starter",
    price: 5,
    trialDays: STARTER_TRIAL_DAYS,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const host = new URL(request.url).searchParams.get("host") || null;

  const billing = await getBillingStatus(admin, session.shop);

  return {
    displayPlan: billing.displayPlan,
    isPrivateTestPlan: billing.isPrivateTestPlan,
    planSelectionUrl: billing.planSelectionUrl,
    host,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const host = formData.get("host") as string | null;
  if (!host) {
    throw new Response("Missing host parameter", { status: 400 });
  }

  const planKey = formData.get("plan") as PlanKey;
  if (!PLANS[planKey]) {
    throw new Response("Invalid plan", { status: 400 });
  }

  return Response.json({ redirectUrl: getPlanSelectionUrl(shop) });
}

export default function PricingPage() {
  const { displayPlan, isPrivateTestPlan, planSelectionUrl, host } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (host) {
      sessionStorage.setItem("shopify_host", host);
    }
  }, [host]);

  const handleSubscribe = (plan: PlanKey) => {
    if (isPrivateTestPlan) return;

    let resolvedHost = host;
    if (!resolvedHost && typeof window !== "undefined") {
      resolvedHost =
        sessionStorage.getItem("shopify_host") ||
        new URLSearchParams(window.location.search).get("host");
    }

    if (!resolvedHost) {
      console.error("Missing host parameter for subscription action");
      return;
    }

    setSubmittingPlan(plan);
    fetcher.submit(
      { plan, host: resolvedHost },
      {
        method: "post",
        action: "/app/pricing",
      },
    );
  };

  const openPlanSelection = () => {
    if (planSelectionUrl && window.top) {
      window.top.location.href = planSelectionUrl;
    }
  };

  useEffect(() => {
    if (fetcher.state === "idle") {
      setSubmittingPlan(null);
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (fetcher.data && "redirectUrl" in fetcher.data) {
      const url = (fetcher.data as { redirectUrl: string }).redirectUrl;
      if (url && window.top) {
        window.top.location.href = url;
      }
    }
  }, [fetcher.data]);

  const isBilledPlanSubmitting = fetcher.state === "submitting";
  const plansDisabled = isPrivateTestPlan;

  return (
    <s-page heading="Pricing Plans">
      <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
        {isPrivateTestPlan && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 text-indigo-700">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-indigo-950">
                    You&apos;re on a Shopify private test plan
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
                    This store has full Starter features for testing. Public
                    pricing plans below are not active on private test stores.
                  </p>
                  <button
                    type="button"
                    onClick={openPlanSelection}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
                  >
                    View available plans in Shopify
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center max-w-xl mx-auto mb-12 pt-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="w-7 h-7 text-brand-600" /> Subscription Plans
          </h1>
          <p className="text-slate-550 mt-2.5 text-sm leading-relaxed">
            Start free on any store. Upgrade to Starter when you need custom
            styling, headless embeds, or API access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
          <div
            className={`bg-white border rounded-2xl p-8 shadow-sm flex flex-col justify-between relative transition-all ${
              plansDisabled
                ? "border-slate-200 opacity-75"
                : displayPlan === "FREE"
                  ? "border-emerald-500 ring-2 ring-emerald-500/10"
                  : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {!plansDisabled && displayPlan === "FREE" && (
              <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Active Plan
              </span>
            )}

            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Free</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Launch your first product-finder quiz
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    $0
                  </span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">
                    / month
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Features included:
                </span>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Unlimited quizzes on your storefront</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Recommend products from answers</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Lead capture & response tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-400/80">
                    <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="line-through">Custom CSS styling</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-400/80">
                    <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="line-through">Custom JavaScript</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-400/80">
                    <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="line-through">Hydrogen & headless embeds</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                disabled={
                  plansDisabled ||
                  displayPlan === "FREE" ||
                  (isBilledPlanSubmitting && submittingPlan === "FREE")
                }
                onClick={() => handleSubscribe("FREE")}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  plansDisabled || displayPlan === "FREE"
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {plansDisabled
                  ? "Free"
                  : isBilledPlanSubmitting && submittingPlan === "FREE"
                    ? "Opening plans..."
                    : displayPlan === "FREE"
                      ? "Your Current Plan"
                      : "Switch to Free"}
              </button>
            </div>
          </div>

          <div
            className={`bg-white border rounded-2xl p-8 shadow-sm flex flex-col justify-between relative transition-all ${
              plansDisabled
                ? "border-slate-200 opacity-75"
                : displayPlan === "STARTER"
                  ? "border-brand-500 ring-2 ring-brand-500/10"
                  : "border-slate-200 hover:border-slate-350 shadow-md"
            }`}
          >
            {!plansDisabled && displayPlan === "STARTER" ? (
              <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                Active Plan
              </span>
            ) : !plansDisabled ? (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Star className="w-3 h-3 fill-current" /> Recommended
              </span>
            ) : null}

            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">
                  For custom storefronts & headless builds
                </p>
                <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    $5
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / month
                  </span>
                </div>
                <p className="text-xs font-semibold text-brand-600 mt-2">
                  {STARTER_TRIAL_DAYS}-day free trial · cancel anytime
                </p>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Everything in Free, plus:
                </span>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Match your brand with custom CSS</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Custom JavaScript for advanced control</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-650">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Hydrogen iframe embed & public API</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                disabled={
                  plansDisabled ||
                  displayPlan === "STARTER" ||
                  (isBilledPlanSubmitting && submittingPlan === "STARTER")
                }
                onClick={() => handleSubscribe("STARTER")}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  plansDisabled || displayPlan === "STARTER"
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-brand-600 border-brand-650 text-white hover:bg-brand-700 shadow-sm"
                }`}
              >
                {plansDisabled
                  ? "Starter"
                  : isBilledPlanSubmitting && submittingPlan === "STARTER"
                    ? "Opening plans..."
                    : displayPlan === "STARTER"
                      ? "Your Current Plan"
                      : `Start ${STARTER_TRIAL_DAYS}-day free trial`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </s-page>
  );
}
