import { useLoaderData, useLocation, useNavigation, useRevalidator, useSearchParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { enrichSubmissionsWithProducts } from "../utils/enrichment.server";
import { useEffect, useState } from "react";
import { ViewResponseModal } from "../components/ViewResponseModal";
import { ResponseDateRangeFilter } from "../components/ResponseDateRangeFilter";
import { ResponseExportModal } from "../components/ResponseExportModal";
import { GENERIC_LOAD_ERROR } from "../utils/userFacingErrors";
import {
  buildSubmissionWhere,
  hasActiveResponseFilters,
  parseResponseFiltersFromUrl,
} from "../utils/responseFilters.server";
import {
  buildDateRangeSearchParams,
  normalizeSelectionForApply,
  type DateRangeSelection,
} from "../utils/responseDateFilters";
import {
  Inbox,
  RotateCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const limit = 8;
  const skip = (page - 1) * limit;

  const filters = parseResponseFiltersFromUrl(url);
  const where = buildSubmissionWhere(session.shop, filters);
  const hasActiveFilters = hasActiveResponseFilters(filters);

  const [submissions, totalCount, totalUnfilteredCount, quizzes] = await Promise.all([
    db.quizSubmission.findMany({
      where,
      include: {
        category: true,
        answers: {
          include: {
            question: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    db.quizSubmission.count({ where }),
    db.quizSubmission.count({ where: { shopId: session.shop } }),
    db.category.findMany({
      where: { shopId: session.shop },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  try {
    const enrichedSubmissions = await enrichSubmissionsWithProducts(admin, submissions);
    return {
      submissions: enrichedSubmissions,
      totalPages: Math.max(Math.ceil(totalCount / limit), 1),
      currentPage: page,
      totalCount,
      totalUnfilteredCount,
      hasActiveFilters,
      filters,
      quizzes,
    };
  } catch (error) {
    console.error("Error enriching submissions:", error);
    return {
      submissions,
      totalPages: Math.max(Math.ceil(totalCount / limit), 1),
      currentPage: page,
      totalCount,
      totalUnfilteredCount,
      hasActiveFilters,
      filters,
      quizzes,
      loadError: GENERIC_LOAD_ERROR,
    };
  }
};

export default function ResponsesPage() {
  const {
    submissions,
    totalPages,
    currentPage,
    totalCount,
    totalUnfilteredCount,
    hasActiveFilters,
    filters,
    quizzes,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigation = useNavigation();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [dateFilterPending, setDateFilterPending] = useState(false);
  const revalidator = useRevalidator();
  const isRefreshing = revalidator.state === "loading";
  const isResponsesReload =
    navigation.state !== "idle" && navigation.location?.pathname === location.pathname;
  const isFiltering = isResponsesReload || dateFilterPending;

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (navigation.state === "idle") {
      setDateFilterPending(false);
    }
  }, [navigation.state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === filters.search) return;

      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set("search", trimmed);
      } else {
        newParams.delete("search");
      }
      newParams.set("page", "1");
      setSearchParams(newParams, { replace: true, preventScrollReset: true });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, searchParams, setSearchParams]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const updateFilter = (key: "quizId", value: string) => {
    updateSearchParams({ [key]: value || null });
  };

  const handleDateRangeApply = (selection: DateRangeSelection) => {
    setDateFilterPending(true);
    const normalized = normalizeSelectionForApply(selection);
    const newParams = buildDateRangeSearchParams(normalized, searchParams);
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    newParams.delete("quizId");
    newParams.delete("datePreset");
    newParams.delete("dateFrom");
    newParams.delete("dateTo");
    newParams.delete("timeFrom");
    newParams.delete("timeTo");
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  const handleViewClick = (submission: any) => {
    setSelectedSubmission(submission);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleRefresh = () => {
    revalidator.revalidate();
  };

  if (totalUnfilteredCount === 0) {
    return (
      <s-page heading="Quiz Responses" inlineSize="large">
        <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-5">
              <Inbox className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">No Responses Yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-2 leading-relaxed">
              Customer quiz responses will show up here as soon as they complete a recommendation flow on your storefront.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Check Again
            </button>
          </div>
        </div>
      </s-page>
    );
  }

  return (
    <s-page heading="Quiz Responses" inlineSize="large">
      <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quiz Responses</h1>
            <p className="text-sm text-slate-500 mt-1">Review recommendation leads and options chosen by your customers.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Table
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-3 py-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px] sm:max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                id="response-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="relative min-w-[130px] sm:min-w-[150px]">
              <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                id="response-quiz"
                value={filters.quizId}
                onChange={(e) => updateFilter("quizId", e.target.value)}
                aria-label="Filter by quiz"
                className="w-full pl-8 pr-6 py-1.5 rounded-lg text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors appearance-none"
              >
                <option value="">All quizzes</option>
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            </div>

            <ResponseDateRangeFilter
              datePreset={filters.datePreset}
              dateFrom={searchParams.get("dateFrom") || filters.dateFrom}
              dateTo={searchParams.get("dateTo") || filters.dateTo}
              timeFrom={filters.timeFrom}
              timeTo={filters.timeTo}
              isLoading={isFiltering}
              onApply={handleDateRangeApply}
            />

            <s-button
              variant="secondary"
              icon="export"
              onClick={() => setExportModalOpen(true)}
            >
              Export
            </s-button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              Clear filters
            </button>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                {hasActiveFilters ? (
                  <>
                    <span className="font-bold text-slate-700">{totalCount}</span>/{totalUnfilteredCount}
                  </>
                ) : (
                  <>
                    <span className="font-bold text-slate-700">{totalUnfilteredCount}</span> total
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {submissions.length === 0 ? (
          isFiltering ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
              <RotateCw className="w-8 h-8 text-brand-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Loading...</p>
            </div>
          ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">No Matching Responses</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-2 leading-relaxed">
              No responses match your current filters. Try adjusting your search, quiz selection, or date range.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
            >
              Clear All Filters
            </button>
          </div>
          )
        ) : (
          <>
            <div className="relative bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              {isFiltering && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[1px]">
                  <RotateCw className="w-7 h-7 text-brand-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Loading...</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase bg-slate-50/50">
                      <th className="px-6 py-4.5">Date & Time</th>
                      <th className="px-6 py-4.5">Quiz Name</th>
                      <th className="px-6 py-4.5">Customer Name</th>
                      <th className="px-6 py-4.5">Email Address</th>
                      <th className="px-6 py-4.5 text-center">Answers</th>
                      <th className="px-6 py-4.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions.map((submission: any) => (
                      <tr key={submission.id} className="group hover:bg-slate-50/45 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[13.5px] font-bold text-slate-800">
                              {new Date(submission.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-xs text-slate-400 font-medium mt-0.5">
                              {new Date(submission.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[180px]">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200 break-words min-w-0"
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {submission.category?.title || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[180px]">
                          <span
                            className="text-[14px] font-semibold text-slate-800 break-words min-w-0 block"
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {submission.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[220px]">
                          <span
                            className="text-[13.5px] font-medium text-slate-500 font-mono break-words min-w-0 block"
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {submission.email}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-extrabold text-slate-600">
                            {submission.answers.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleViewClick(submission)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-xs font-semibold text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <ViewResponseModal
        submission={selectedSubmission}
        open={modalOpen}
        onClose={handleCloseModal}
      />

      <ResponseExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        search={filters.search}
        quizId={filters.quizId}
      />
    </s-page>
  );
}
