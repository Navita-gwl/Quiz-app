import { useState, useEffect } from "react";
import { X, Calendar, User, Mail, ClipboardList, ShoppingBag, ExternalLink, AlertCircle } from "lucide-react";
import { readJsonErrorMessage, GENERIC_LOAD_ERROR } from "../utils/userFacingErrors";

interface Answer {
  id: string;
  questionId: string | null;
  questionText: string | null;
  answer: unknown;
  question: {
    id: string;
    text: string;
    options: unknown;
  } | null;
}

interface Submission {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  answers: Answer[];
  recommendations?: any;
  shopId?: string;
  category?: {
    id: string;
    title: string;
    handle: string;
  } | null;
}

interface ViewResponseModalProps {
  submission: Submission | null;
  open: boolean;
  onClose: () => void;
}

const wrapTextClass = "break-words min-w-0";
const wrapTextStyle = { overflowWrap: "anywhere" as const };

interface MappedProductRef {
  productId: string;
  productTitle?: string;
}

function extractMappedProducts(matched: any): MappedProductRef[] {
  const refs: MappedProductRef[] = [];
  if (Array.isArray(matched?.products) && matched.products.length > 0) {
    for (const p of matched.products) {
      if (p?.productId && typeof p.productId === "string" && p.productId.trim() !== "") {
        refs.push({ productId: p.productId.trim(), productTitle: p.productTitle });
      }
    }
  } else if (matched?.productId && typeof matched.productId === "string" && matched.productId.trim() !== "") {
    refs.push({ productId: matched.productId.trim(), productTitle: matched.productTitle });
  }
  return refs;
}

function buildRecommendationLookup(recommendations: unknown): Map<string, { title?: string }> {
  const map = new Map<string, { title?: string }>();
  if (!Array.isArray(recommendations)) return map;
  for (const product of recommendations) {
    if (product?.id && typeof product.id === "string") {
      map.set(product.id, product);
    }
  }
  return map;
}

export function ViewResponseModal({ submission, open, onClose }: ViewResponseModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [submission?.id]);

  useEffect(() => {
    if (!open || !submission?.id) return;

    let isMounted = true;
    const fetchRecommendations = async () => {
      setLoading(true);
      setRecommendationsError(null);
      try {
        const response = await fetch(
          `/api/quiz-submission/${submission.id}/recommendations?page=${currentPage}&pageSize=6`
        );
        if (!response.ok) {
          throw new Error(await readJsonErrorMessage(response, GENERIC_LOAD_ERROR));
        }
        const data = await response.json();
        if (isMounted) {
          setProducts(data.products || []);
          setTotalPages(data.pagination?.totalPages || 0);
          setTotalProducts(data.pagination?.totalProducts || 0);
          setHasNextPage(data.pagination?.hasNextPage || false);
          setHasPreviousPage(data.pagination?.hasPreviousPage || false);
        }
      } catch (error) {
        console.error("Error fetching paginated recommendations:", error);
        if (isMounted) {
          setProducts([]);
          setRecommendationsError(
            error instanceof Error
              ? error.message
              : "We couldn't load recommended products. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, [submission?.id, currentPage, open]);

  if (!open || !submission) return null;

  const getNumericProductId = (gid: string) => {
    if (typeof gid !== "string") return "";
    return gid.split("/").pop() || "";
  };

  const getProductAdminUrl = (productId: string) => {
    const numericId = getNumericProductId(productId);
    if (!numericId || !submission.shopId) return null;
    return `https://${submission.shopId}/admin/products/${numericId}`;
  };

  const resolveMappedProductTitle = (
    ref: MappedProductRef,
    recommendationLookup: Map<string, { title?: string }>
  ) => {
    if (ref.productTitle && ref.productTitle.trim() !== "") {
      return ref.productTitle.trim();
    }
    const fromSubmission = recommendationLookup.get(ref.productId);
    if (fromSubmission?.title && String(fromSubmission.title).trim() !== "") {
      return String(fromSubmission.title).trim();
    }
    const numericId = getNumericProductId(ref.productId);
    return numericId ? `Product #${numericId}` : "Deleted Product";
  };

  const recommendationLookup = buildRecommendationLookup(submission.recommendations);

  const isBase64Image = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith("data:image/");

  const isImageUrl = (value: unknown): value is string => {
    if (typeof value !== "string" || !value.trim()) return false;
    if (isBase64Image(value)) return true;
    return (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("//") ||
      value.startsWith("/")
    );
  };

  const normalizeImageSrc = (src: string) => (src.startsWith("//") ? `https:${src}` : src);

  const parseQuestionOptions = (questionOptions: unknown): unknown[] | null => {
    if (!questionOptions) return null;
    if (typeof questionOptions === "string") {
      try {
        const parsed = JSON.parse(questionOptions);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return Array.isArray(questionOptions) ? questionOptions : null;
  };

  const findMatchingOption = (value: unknown, questionOptions: unknown) => {
    const options = parseQuestionOptions(questionOptions);
    if (!options) return null;
    return options.find((opt: any) => {
      if (typeof opt !== "object" || opt === null) return String(opt) === String(value);
      return opt.label === value || opt.imageSrc === value || opt.value === value;
    }) as any;
  };

  const resolveOptionImageSrc = (value: unknown, questionOptions?: unknown): string | null => {
    if (isImageUrl(value)) return normalizeImageSrc(value);
    const matched = findMatchingOption(value, questionOptions);
    if (matched?.imageSrc && isImageUrl(matched.imageSrc)) {
      return normalizeImageSrc(matched.imageSrc);
    }
    return null;
  };

  const renderSingleValue = (value: unknown, questionOptions?: unknown, key?: string) => {
    const matched = findMatchingOption(value, questionOptions);
    const displayLabel =
      matched?.label && typeof matched.label === "string"
        ? matched.label
        : typeof value === "string" && !isImageUrl(value)
          ? value
          : null;
    const imageSrc = resolveOptionImageSrc(value, questionOptions);

    if (imageSrc) {
      return (
        <span key={key} className="inline-flex flex-col items-start gap-1.5 mt-1">
          <img
            src={imageSrc}
            alt={displayLabel || "Selected option"}
            className="w-20 h-20 object-cover rounded-xl border border-slate-200 block shadow-xs"
          />
          {displayLabel && (
            <span className={`text-xs font-semibold text-slate-700 ${wrapTextClass}`} style={wrapTextStyle}>
              {displayLabel}
            </span>
          )}
        </span>
      );
    }
    if (typeof value === "string") {
      return (
        <span key={key} className={`font-semibold text-slate-800 ${wrapTextClass}`} style={wrapTextStyle}>
          {value}
        </span>
      );
    }
    try {
      return (
        <span key={key} className={`font-semibold text-slate-800 ${wrapTextClass}`} style={wrapTextStyle}>
          {JSON.stringify(value)}
        </span>
      );
    } catch {
      return (
        <span key={key} className={`font-semibold text-slate-800 ${wrapTextClass}`} style={wrapTextStyle}>
          {String(value)}
        </span>
      );
    }
  };

  const renderAnswer = (answer: unknown, questionOptions?: unknown) => {
    if (Array.isArray(answer)) {
      if (answer.some((item) => resolveOptionImageSrc(item, questionOptions))) {
        return (
          <div className="flex flex-wrap gap-3 items-start mt-2 w-full">
            {answer.map((item, i) => renderSingleValue(item, questionOptions, String(i)))}
          </div>
        );
      }
      return (
        <span className={`font-semibold text-slate-800 ${wrapTextClass}`} style={wrapTextStyle}>
          {answer.join(", ")}
        </span>
      );
    }
    return renderSingleValue(answer, questionOptions);
  };

  const formattedDate = new Date(submission.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = new Date(submission.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-[950px] w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Quiz Submission Detail
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate} at {formattedTime}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* User Info Grid Card */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">Customer & Quiz Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Name</div>
                  <div className={`text-[13px] font-bold text-slate-800 mt-0.5 ${wrapTextClass}`} style={wrapTextStyle}>
                    {submission.name}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-650 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Email</div>
                  <div className={`text-[13px] font-bold text-slate-800 mt-0.5 ${wrapTextClass} font-mono`} style={wrapTextStyle}>
                    {submission.email}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-650 flex-shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Quiz Name</div>
                  <div className={`text-[13px] font-bold text-slate-800 mt-0.5 ${wrapTextClass}`} style={wrapTextStyle}>
                    {submission.category?.title || "General"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-650 flex-shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Responses count</div>
                  <div className="text-[13px] font-bold text-slate-800 mt-0.5">
                    {submission.answers.length} answered
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Responses Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Questions & Answers</h3>
            <div className="space-y-4">
              {submission.answers.map((answer, index) => (
                <div
                  key={answer.id}
                  className="bg-white border border-slate-200/70 rounded-2xl p-4.5 shadow-xs flex flex-col gap-2.5 hover:border-slate-300 transition-colors min-w-0"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 mt-0.5 shrink-0">
                      {index + 1}
                    </span>
                    <span className={`text-sm font-bold text-slate-800 leading-snug flex-1 min-w-0 ${wrapTextClass}`} style={wrapTextStyle}>
                      {answer.question?.text || answer.questionText || "Deleted Question"}
                      {answer.question === null && answer.questionText && (
                        <span className="text-slate-400 font-medium ml-1.5 text-xs">(Deleted)</span>
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium pl-7 flex flex-wrap items-start gap-1.5 min-w-0">
                    <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px] w-full">Answer Chosen:</span>
                    <div className={`min-w-0 ${wrapTextClass}`} style={wrapTextStyle}>
                      {renderAnswer(answer.answer, answer.question?.options)}
                    </div>
                  </div>

                  {(() => {
                    const questionOptions = parseQuestionOptions(answer.question?.options);
                    if (!questionOptions) return null;
                    const selectedAnswers = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
                    const mappedProducts: MappedProductRef[] = [];

                    for (const ans of selectedAnswers) {
                      const matched = findMatchingOption(ans, questionOptions);
                      if (matched) {
                        mappedProducts.push(...extractMappedProducts(matched));
                      }
                    }

                    if (mappedProducts.length === 0) return null;

                    return (
                      <div className="text-xs text-slate-500 font-medium pl-7 flex flex-wrap items-start gap-1.5 pt-1 border-t border-dashed border-slate-100 mt-1 min-w-0">
                        <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px] w-full">Mapped Recommendation:</span>
                        <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${wrapTextClass}`} style={wrapTextStyle}>
                          {mappedProducts.map((productRef, productIndex) => {
                            const title = resolveMappedProductTitle(productRef, recommendationLookup);
                            const adminUrl = getProductAdminUrl(productRef.productId);
                            return (
                              <span key={`${productRef.productId}-${productIndex}`} className="inline-flex items-center gap-1">
                                {productIndex > 0 && <span className="text-slate-400">,</span>}
                                {adminUrl ? (
                                  <a
                                    href={adminUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 font-semibold text-brand-600 hover:text-brand-700"
                                  >
                                    {title}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="font-semibold text-slate-700">{title}</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Products Snapshot */}
          <div className="pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recommended Storefront Products</h3>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-pulse">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/50 border border-slate-200/40 rounded-2xl p-3.5 flex gap-3.5 items-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendationsError ? (
              <div className="text-xs text-rose-700 bg-rose-50 p-4 rounded-xl border border-rose-100 text-center font-medium flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {recommendationsError}
              </div>
            ) : products.length === 0 ? (
              <div className="text-xs text-slate-450 italic bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center font-medium">
                No products were recommended for this submission.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {products.map((product: any) => {
                    const numericId = getNumericProductId(product.id);
                    const adminUrl = submission.shopId
                      ? `https://${submission.shopId}/admin/products/${numericId}`
                      : null;
                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-slate-200/70 rounded-2xl p-3.5 flex gap-3.5 items-center hover:border-slate-300 transition-colors shadow-xs"
                      >
                        {product.featuredImage?.url ? (
                          <img
                            src={product.featuredImage.url}
                            alt={product.featuredImage.altText || product.title}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-200/80 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">
                            No Image
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {adminUrl ? (
                            <a
                              href={adminUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm font-bold text-slate-800 no-underline hover:text-slate-800 ${wrapTextClass}`}
                              style={wrapTextStyle}
                            >
                              {product.title}
                            </a>
                          ) : (
                            <div className={`text-sm font-bold text-slate-800 ${wrapTextClass}`} style={wrapTextStyle}>
                              {product.title}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 font-semibold mt-0.5">
                            {product.currencyCode} {parseFloat(product.price || '0').toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={!hasPreviousPage}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Page {currentPage} of {totalPages} ({totalProducts} products)
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={!hasNextPage}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
