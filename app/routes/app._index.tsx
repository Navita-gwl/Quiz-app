import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { buildQuizBlockThemeEditorUrl } from "../utils/themeEditorDeepLink.server";
import { ThemeEditorLink } from "../components/ThemeEditorLink";
import { 
  Plus, 
  Layers, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  Inbox,
  LayoutDashboard
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const quizCount = await db.category.count({
    where: { shopId: session.shop },
  });
  
  const submissionCount = await db.quizSubmission.count({
    where: { shopId: session.shop },
  });

  const recentSubmissions = await db.quizSubmission.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      category: true,
      answers: true
    }
  });

  return {
    quizCount,
    submissionCount,
    recentSubmissions,
    addQuizBlockUrl: buildQuizBlockThemeEditorUrl(session.shop),
  };
};

export default function Index() {
  const { quizCount, submissionCount, recentSubmissions, addQuizBlockUrl } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Quiz Dashboard" inlineSize="large">
      <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
        
        {/* Welcome Section */}
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-8 md:p-10 mb-8 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white to-brand-50/10"></div>
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-brand-650" /> Welcome to QuizInsights
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
              Power product discovery with personalized quizzes.
            </h1>
            <p className="text-slate-600 text-sm md:text-[14.5px] mb-6 leading-relaxed">
              Create engaging quizzes, collect qualified leads, and recommend the exact products your customers are looking for.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link 
                to="/app/questions" 
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" /> Create or Manage Quizzes
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">Active Quizzes</p>
              <h3 className="text-3xl font-bold text-slate-900">{quizCount}</h3>
              <p className="text-xs text-slate-500 mt-1">Ready for customers</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">Total Submissions</p>
              <h3 className="text-3xl font-bold text-slate-900">{submissionCount}</h3>
              <p className="text-xs text-slate-500 mt-1">Leads collected</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">Lead Conversion</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {submissionCount > 0 ? "100%" : "0%"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Submission success rate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Submissions */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Submissions</h3>
                <p className="text-xs text-slate-500">Overview of the latest leads captured by your storefront</p>
              </div>
              <Link 
                to="/app/responses" 
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >
                View all responses <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                  <Inbox className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-700">No submissions yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">Once customers start interacting with your storefront quiz, their responses and details will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Quiz</th>
                      <th className="pb-3 font-medium">Answers</th>
                      <th className="pb-3 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="text-sm group hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5">
                          <div className="font-medium text-slate-900">{sub.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{sub.email}</div>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {sub.category?.title || "General"}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-600">
                          {sub.answers.length} answered
                        </td>
                        <td className="py-3.5 text-right text-slate-500 text-xs">
                          {new Date(sub.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Start Guide & Helpful Links */}
          <div className="flex flex-col gap-6">
            
            {/* Quick Start Guide */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Start Guide</h3>
              
              <div className="relative pl-6 border-l border-slate-100 space-y-6">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 shadow-sm flex items-center justify-center text-[8px] text-white font-bold">
                    1
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Configure Questions</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Create questions, answer choices, and map options to product recommendations in <Link to="/app/questions" className="text-indigo-600 hover:underline">Questions</Link>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 shadow-sm flex items-center justify-center text-[8px] text-white font-bold">
                    2
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Add Quiz to Theme</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Open the Theme Editor and add the QuizInsights Quiz block to your storefront.
                  </p>
                  {addQuizBlockUrl ? (
                    <ThemeEditorLink
                      url={addQuizBlockUrl}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Add Quiz block in Theme Editor <ArrowRight className="w-3.5 h-3.5" />
                    </ThemeEditorLink>
                  ) : null}
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 shadow-sm flex items-center justify-center text-[8px] text-white font-bold">
                    3
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Monitor Leads</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Check the <Link to="/app/responses" className="text-indigo-600 hover:underline">Responses</Link> tab for lead details and recommendation match results.
                  </p>
                </div>
              </div>
            </div>

            {/* Helpful Links */}
            <div className="bg-indigo-950 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-900/40 rounded-full blur-2xl"></div>
              
              <h3 className="text-base font-bold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Need Help?
              </h3>
              <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                Visit our documentation for setup guides, theme embedding, custom CSS and JavaScript, quiz translations, and headless iframe options for Hydrogen storefronts.
              </p>
              
              <Link 
                to="/app/documentation"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-800 hover:bg-indigo-750 text-white transition-colors"
              >
                Open Documentation <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
