import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, useLocation, useNavigation, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { ResponseDateRangeFilter } from "../components/ResponseDateRangeFilter";
import {
  buildSubmissionWhere,
  parseResponseFiltersFromUrl,
} from "../utils/responseFilters.server";
import {
  buildDateRangeSearchParams,
  buildResponsesFilterSearchParams,
  getDatePresetLabel,
  normalizeSelectionForApply,
  type DateRangeSelection,
} from "../utils/responseDateFilters";
import {
  ArrowRight,
  BarChart3,
  Layers,
  MessageSquare,
  RotateCw,
  Trophy,
  TrendingUp,
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const filters = parseResponseFiltersFromUrl(url);

  const dateWhere = buildSubmissionWhere(session.shop, {
    search: "",
    quizId: "",
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    timeFrom: filters.timeFrom,
    timeTo: filters.timeTo,
  });

  const [quizzes, submissionGroups, totalResponses, totalQuizzes] = await Promise.all([
    db.category.findMany({
      where: { shopId: session.shop },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.quizSubmission.groupBy({
      by: ["categoryId"],
      where: dateWhere,
      _count: { _all: true },
    }),
    db.quizSubmission.count({ where: dateWhere }),
    db.category.count({ where: { shopId: session.shop } }),
  ]);

  const countByQuizId = new Map<string, number>();
  let uncategorizedCount = 0;

  for (const group of submissionGroups) {
    if (group.categoryId) {
      countByQuizId.set(group.categoryId, group._count._all);
    } else {
      uncategorizedCount += group._count._all;
    }
  }

  const quizPerformance = quizzes
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      responseCount: countByQuizId.get(quiz.id) || 0,
    }))
    .sort((a, b) => b.responseCount - a.responseCount || a.title.localeCompare(b.title));

  const quizzesWithResponses = quizPerformance.filter((quiz) => quiz.responseCount > 0).length;
  const averageResponses =
    totalQuizzes > 0 ? Math.round((totalResponses / totalQuizzes) * 10) / 10 : 0;
  const topPerformingQuiz = quizPerformance.find((quiz) => quiz.responseCount > 0) ?? null;

  return {
    filters,
    totalResponses,
    totalQuizzes,
    quizzesWithResponses,
    averageResponses,
    quizPerformance,
    topPerformingQuiz,
    uncategorizedCount,
    dateLabel: getDatePresetLabel(filters.datePreset, filters.dateFrom, filters.dateTo),
  };
};

export default function AnalyticsPage() {
  const {
    filters,
    totalResponses,
    totalQuizzes,
    quizzesWithResponses,
    averageResponses,
    quizPerformance,
    topPerformingQuiz,
    uncategorizedCount,
    dateLabel,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigation = useNavigation();
  const [dateFilterPending, setDateFilterPending] = useState(false);
  const isAnalyticsReload =
    navigation.state !== "idle" && navigation.location?.pathname === location.pathname;
  const isFiltering = isAnalyticsReload || dateFilterPending;

  useEffect(() => {
    if (navigation.state === "idle") {
      setDateFilterPending(false);
    }
  }, [navigation.state]);

  const handleDateRangeApply = (selection: DateRangeSelection) => {
    setDateFilterPending(true);
    const normalized = normalizeSelectionForApply(selection);
    const newParams = buildDateRangeSearchParams(normalized, searchParams);
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const handleClearDateFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("datePreset");
    newParams.delete("dateFrom");
    newParams.delete("dateTo");
    newParams.delete("timeFrom");
    newParams.delete("timeTo");
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const hasDateFilter = filters.datePreset !== "all";

  const buildResponsesLink = (quizId?: string) => {
    const params = buildResponsesFilterSearchParams(filters, quizId ? { quizId } : undefined);
    return `/app/responses?${params.toString()}`;
  };

  return (
    <s-page heading="Analytics" inlineSize="large">
      <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">
              Quiz performance overview for {dateLabel.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-3 py-2 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <ResponseDateRangeFilter
              datePreset={filters.datePreset}
              dateFrom={searchParams.get("dateFrom") || filters.dateFrom}
              dateTo={searchParams.get("dateTo") || filters.dateTo}
              timeFrom={filters.timeFrom}
              timeTo={filters.timeTo}
              isLoading={isFiltering}
              onApply={handleDateRangeApply}
            />

            {hasDateFilter && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                disabled={isFiltering}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                Clear Filter
              </button>
            )}

            <span className="ml-auto text-[11px] font-medium text-slate-500 whitespace-nowrap">
              <span className="font-bold text-slate-700">{totalResponses}</span> responses
            </span>
          </div>
        </div>

        <div className="relative">
          {isFiltering && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/70 backdrop-blur-[1px] rounded-2xl min-h-[240px]">
              <RotateCw className="w-7 h-7 text-brand-600 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading...</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Total Responses
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900">{totalResponses}</h3>
                  <p className="text-xs text-slate-500 mt-1">{dateLabel}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              {totalResponses > 0 && (
                <Link
                  to={buildResponsesLink()}
                  className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all responses <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Active Quizzes
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900">{quizzesWithResponses}</h3>
                  <p className="text-xs text-slate-500 mt-1">of {totalQuizzes} total quizzes</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Avg. per Quiz
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900">{averageResponses}</h3>
                  <p className="text-xs text-slate-500 mt-1">Responses in selected period</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Top Performing Quiz
                  </p>
                  {topPerformingQuiz ? (
                    <>
                      <h3 className="text-lg font-bold text-slate-900 truncate" title={topPerformingQuiz.title}>
                        {topPerformingQuiz.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {topPerformingQuiz.responseCount} response
                        {topPerformingQuiz.responseCount === 1 ? "" : "s"}
                        {totalResponses > 0
                          ? ` · ${Math.round((topPerformingQuiz.responseCount / totalResponses) * 100)}% of total`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold text-slate-900">—</h3>
                      <p className="text-xs text-slate-500 mt-1">No responses in selected period</p>
                    </>
                  )}
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              {topPerformingQuiz && (
                <Link
                  to={buildResponsesLink(topPerformingQuiz.id)}
                  className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View quiz responses <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Quiz performance</h2>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Click a quiz to view its responses
              </span>
            </div>

            {totalQuizzes === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base tracking-tight">No quizzes yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-2">
                  Create a quiz to start collecting responses and see performance here.
                </p>
                <Link
                  to="/app/questions"
                  className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
                >
                  Go to Quiz Builder
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {quizPerformance.map((quiz) => {
                  const share =
                    totalResponses > 0
                      ? Math.round((quiz.responseCount / totalResponses) * 100)
                      : 0;

                  return (
                    <Link
                      key={quiz.id}
                      to={buildResponsesLink(quiz.id)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <Layers className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{quiz.title}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[220px]">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${Math.max(share, quiz.responseCount > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-900">{quiz.responseCount}</p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {share}% of total
                        </p>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />
                    </Link>
                  );
                })}

                {uncategorizedCount > 0 && (
                  <Link
                    to={buildResponsesLink()}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group bg-slate-50/40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700">Uncategorized</p>
                      <p className="text-xs text-slate-500 mt-0.5">Responses without a linked quiz</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">{uncategorizedCount}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
