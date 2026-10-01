import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { OptionsInput, normaliseOptions } from "./MCQOptionsInput";
import type { OptionItem } from "./MCQOptionsInput";
import {
  collectQuestionFormErrors,
  validateQuestionText,
  QUESTION_TITLE_HARD_MAX_LENGTH,
  MAX_QUESTION_DESCRIPTION_LENGTH,
  QUESTION_TITLE_TOO_LONG_ERROR,
  OPTION_LABEL_TOO_LONG_ERROR,
  OPTION_LABEL_EMPTY_ERROR,
  OPTION_IMAGE_EMPTY_ERROR,
  OPTION_PRODUCT_REQUIRED_ERROR,
  validateOptionProducts,
  validateQuestionOptionsComplete,
  isOptionInlineFieldError,
  hasEmptyOptionLabels,
  isQuestionTitleTooLong,
  hasOverLengthOptionLabels,
  getWithinQuestionDuplicateOptionLabelErrors,
  isOptionLabelDuplicateBannerError,
  getOptionLabelDuplicateHighlightIndices,
  promoteOptionLabelDuplicateErrorsToBanner,
  OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR,
} from "../utils/validation";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import { X, Sparkles, AlertCircle } from "lucide-react";
import { resolveFetcherError, GENERIC_SAVE_ERROR } from "../utils/userFacingErrors";

interface Question {
  id: string;
  text: string;
  type: "RADIO" | "CHECKBOX" | "DROPDOWN" | "DROPDOWN_MULTI";
  options: unknown;
  optionType?: string;
  createdAt: string;
}

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editQuestion?: Question | null;
  categoryId?: string;
}

export function AddQuestionModal({ open, onClose, onSaved, editQuestion, categoryId }: AddQuestionModalProps) {
  const fetcher = useFetcher<any>();
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const questionWrapperRef = useRef<HTMLDivElement>(null);
  const optionsSectionRef = useRef<HTMLDivElement>(null);
  const optionsErrorRef = useRef<HTMLDivElement>(null);
  const processedFetcherDataRef = useRef<unknown>(null);
  const loadedQuestionIdRef = useRef<string | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [questionDescription, setQuestionDescription] = useState("");
  const [productSelectionType, setProductSelectionType] = useState<"single" | "multiple">("single");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [questionType, setQuestionType] = useState<"RADIO" | "CHECKBOX" | "DROPDOWN" | "DROPDOWN_MULTI">("RADIO");
  const [optionType, setOptionType] = useState<"text" | "image">("text");
  const [options, setOptions] = useState<OptionItem[]>([{ label: "" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  const isSubmitting = fetcher.state === "submitting";
  const isEditMode = !!editQuestion;

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearOptionsError = () => {
    clearFieldError("options");
  };

  const handleOptionsChange = (nextOptions: OptionItem[]) => {
    setOptions(nextOptions);

    if (
      errors.options === OPTION_LABEL_TOO_LONG_ERROR &&
      !hasOverLengthOptionLabels(nextOptions, optionType)
    ) {
      clearOptionsError();
    }

    if (
      errors.options === OPTION_PRODUCT_REQUIRED_ERROR &&
      validateOptionProducts(nextOptions).isValid
    ) {
      clearOptionsError();
    }

    if (
      (errors.options === OPTION_LABEL_EMPTY_ERROR ||
        errors.options === OPTION_IMAGE_EMPTY_ERROR) &&
      !hasEmptyOptionLabels(nextOptions, optionType)
    ) {
      clearOptionsError();
    }

    if (errors.options && isOptionLabelDuplicateBannerError(errors.options)) {
      clearOptionsError();
    }

    const withinDuplicateErrors = getWithinQuestionDuplicateOptionLabelErrors(
      nextOptions,
      optionType
    );
    if (Object.keys(withinDuplicateErrors).length > 0) {
      setErrors((prev) => ({
        ...prev,
        options: OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR,
      }));
    }
  };

  const scrollToFirstError = (errorMap: Record<string, string>) => {
    setTimeout(() => {
      if (errorMap.text || errorMap.description) {
        questionWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (errorMap.options) {
        optionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }, 50);
  };

  useEffect(() => {
    if (options.length >= 2 && errors.options === "At least 2 options are required") {
      clearOptionsError();
    }
  }, [options.length, errors.options]);

  useEffect(() => {
    if (
      errors.options === OPTION_PRODUCT_REQUIRED_ERROR &&
      validateOptionProducts(options).isValid
    ) {
      clearOptionsError();
    }
  }, [options, errors.options]);

  useEffect(() => {
    if (
      (errors.options === OPTION_LABEL_EMPTY_ERROR ||
        errors.options === OPTION_IMAGE_EMPTY_ERROR) &&
      !hasEmptyOptionLabels(options, optionType)
    ) {
      clearOptionsError();
    }
  }, [options, optionType, errors.options]);

  const scrollToOptionsError = () => {
    setTimeout(() => {
      optionsErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  // Initialize form when opening add vs edit (by question id)
  useEffect(() => {
    if (!open) {
      loadedQuestionIdRef.current = null;
      return;
    }

    const nextQuestionId = editQuestion?.id ?? "new";
    if (loadedQuestionIdRef.current === nextQuestionId) return;
    loadedQuestionIdRef.current = nextQuestionId;

    processedFetcherDataRef.current = null;

    if (editQuestion) {
      const text = editQuestion.text;
      const description = (editQuestion as any).description || "";
      const rawOptType = (editQuestion as any).optionType || "text";
      const normalizedOptionType = rawOptType === "image" ? "image" : "text";
      const loadedOptions = normaliseOptions(editQuestion.options);

      setQuestionText(text);
      setQuestionDescription(description);
      setProductSelectionType((editQuestion as any).productSelectionType || "single");
      setQuestionType(editQuestion.type);
      setOptionType(normalizedOptionType);
      setOptions(loadedOptions);

      const lengthErrors: Record<string, string> = {};
      if (isQuestionTitleTooLong(text)) {
        lengthErrors.text = QUESTION_TITLE_TOO_LONG_ERROR;
      }
      if (hasOverLengthOptionLabels(loadedOptions, normalizedOptionType)) {
        lengthErrors.options = OPTION_LABEL_TOO_LONG_ERROR;
      }

      if (Object.keys(lengthErrors).length > 0) {
        setErrors(lengthErrors);
        setShowValidation(true);
      } else {
        setErrors({});
        setShowValidation(false);
      }
    } else {
      setErrors({});
      setShowValidation(false);
      setQuestionText("");
      setQuestionDescription("");
      setProductSelectionType("single");
      setQuestionType("RADIO");
      setOptionType("text");
      setOptions([{ label: "" }]);
    }
  }, [open, editQuestion?.id, editQuestion]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setShowConfirmationModal(false);
      loadedQuestionIdRef.current = null;
      processedFetcherDataRef.current = null;
    }
  }, [open]);
  const handleQuestionTypeChange = (newType: string) => {
    setQuestionType(newType as any);
    clearFieldError("type");
    clearOptionsError();
    if (newType === "DROPDOWN" || newType === "DROPDOWN_MULTI") {
      setOptionType("text");
      if (optionType === "image") {
        setOptions([{ label: "" }]);
      }
    }
  };

  // Handle option type toggle
  const handleOptionTypeChange = (newType: "text" | "image") => {
    if (newType === optionType) return;
    setOptionType(newType);
    clearFieldError("optionType");
    clearOptionsError();
    setOptions([{ label: "" }]);
  };

  // Handle fetcher submission result
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data === processedFetcherDataRef.current) return;
    processedFetcherDataRef.current = fetcher.data;

    if (fetcher.data.success === true) {
      onSaved?.();
      onClose();
      return;
    }

    if (fetcher.data.errors && typeof fetcher.data.errors === "object") {
      setShowValidation(true);
      const promotedErrors = promoteOptionLabelDuplicateErrorsToBanner(fetcher.data.errors);
      if (
        promotedErrors.options &&
        isOptionInlineFieldError(promotedErrors.options)
      ) {
        delete promotedErrors.options;
      }
      setErrors(promotedErrors);
      scrollToFirstError(promotedErrors);
      if (
        !promotedErrors.options &&
        (hasEmptyOptionLabels(options, optionType) ||
          hasOverLengthOptionLabels(options, optionType))
      ) {
        optionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const fetcherError = resolveFetcherError(fetcher.data, GENERIC_SAVE_ERROR);
    if (fetcherError) {
      setShowValidation(true);
      setErrors({ form: fetcherError });
    }
  }, [fetcher.state, fetcher.data, onClose, onSaved]);

  const confirmToggleToSingle = () => {
    const updatedOptions = options.map((opt) => {
      if (opt.products && opt.products.length > 1) {
        const primary = opt.products[0];
        return {
          ...opt,
          productId: primary.productId,
          productHandle: primary.productHandle,
          productTitle: primary.productTitle,
          productImage: primary.productImage,
          products: [primary],
        };
      }
      return opt;
    });
    setOptions(updatedOptions);
    setProductSelectionType("single");
    setShowConfirmationModal(false);
  };

  const handleProductSelectionTypeChange = (newType: "single" | "multiple") => {
    if (newType === productSelectionType) return;

    if (newType === "single") {
      const hasMultipleProducts = options.some(
        (opt) => opt.products && opt.products.length > 1
      );
      if (hasMultipleProducts) {
        setShowConfirmationModal(true);
      } else {
        const updatedOptions = options.map((opt) => {
          if (opt.products && opt.products.length === 1) {
            const primary = opt.products[0];
            return {
              ...opt,
              productId: primary.productId,
              productHandle: primary.productHandle,
              productTitle: primary.productTitle,
              productImage: primary.productImage,
              products: [primary],
            };
          }
          return opt;
        });
        setOptions(updatedOptions);
        setProductSelectionType("single");
      }
    } else {
      setProductSelectionType("multiple");
    }
  };

  const handleSubmit = () => {
    setShowValidation(true);

    const newErrors = collectQuestionFormErrors({
      text: questionText,
      description: questionDescription,
      options,
      optionType,
    });
    const optionsValidation = validateQuestionOptionsComplete(options, optionType);
    const hasValidationErrors =
      Object.keys(newErrors).length > 0 || !optionsValidation.isValid;

    if (hasValidationErrors) {
      const promotedErrors = promoteOptionLabelDuplicateErrorsToBanner(newErrors);
      if (
        promotedErrors.options &&
        isOptionInlineFieldError(promotedErrors.options)
      ) {
        delete promotedErrors.options;
      }
      setErrors(promotedErrors);
      scrollToFirstError(promotedErrors);
      if (
        !promotedErrors.options &&
        (hasEmptyOptionLabels(options, optionType) ||
          hasOverLengthOptionLabels(options, optionType))
      ) {
        optionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setErrors({});

    const cleanedOptions: any[] = options.map((opt) => {
      const base: any = {};

      if (productSelectionType === "single") {
        if (opt.productId) {
          base.productId = opt.productId;
        } else if (Array.isArray(opt.products) && opt.products.length > 0) {
          base.productId = opt.products[0].productId;
        }
      } else {
        if (Array.isArray(opt.products)) {
          base.products = opt.products
            .map((p: any) => ({
              productId: p.productId,
            }))
            .filter((p: any) => p.productId);
        } else if (opt.productId) {
          base.products = [{ productId: opt.productId }];
        }
      }

      if (optionType === "image") {
        return {
          ...base,
          imageSrc: opt.imageSrc ?? "",
          label: opt.label ?? "",
        };
      }
      return {
        ...base,
        label: opt.label ?? "",
      };
    });

    const formData = new FormData();
    formData.append("text", questionText);
    formData.append("description", questionDescription);
    formData.append("productSelectionType", productSelectionType);
    formData.append("type", questionType);
    formData.append("optionType", optionType);
    formData.append("options", JSON.stringify(cleanedOptions));
    if (categoryId) {
      formData.append("categoryId", categoryId);
    }

    const action = isEditMode
      ? `/api/questions/${editQuestion!.id}/update`
      : "/api/questions/create";

    fetcher.submit(formData, { method: "POST", action });
  };

  if (!open) return null;

  const titleError =
    errors.text ||
    (isQuestionTitleTooLong(questionText) ? QUESTION_TITLE_TOO_LONG_ERROR : "");

  const duplicateBannerMessage =
    errors.options && isOptionLabelDuplicateBannerError(errors.options)
      ? errors.options
      : "";

  const duplicateHighlightIndices = duplicateBannerMessage
    ? getOptionLabelDuplicateHighlightIndices(options, optionType)
    : [];

  const displayOptionsError = (() => {
    if (duplicateBannerMessage) {
      return duplicateBannerMessage;
    }

    const message =
      errors.options ||
      (hasOverLengthOptionLabels(options, optionType) ? OPTION_LABEL_TOO_LONG_ERROR : "");
    return isOptionInlineFieldError(message) ? "" : message;
  })();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-[850px] w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">
              {isEditMode ? "Edit Question" : "Add New Question"}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div ref={modalContainerRef} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 scroll-smooth">
          {errors.form && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}
          
          {/* Question Input */}
          <div ref={questionWrapperRef} className="flex flex-col gap-1.5 min-w-0">
            <label className="font-bold text-sm text-slate-700">Question Title <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={questionText}
              maxLength={QUESTION_TITLE_HARD_MAX_LENGTH}
              onChange={(e) => {
                const value = e.target.value.slice(0, QUESTION_TITLE_HARD_MAX_LENGTH);
                setQuestionText(value);
                if (errors.text && validateQuestionText(value).isValid) {
                  clearFieldError("text");
                }
              }}
              placeholder="e.g. What is your skin type?"
              className={`w-full min-w-0 h-11 px-3.5 border rounded-xl text-[14px] font-medium outline-none transition-all ${
                titleError
                  ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" 
                  : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              }`}
            />
            {titleError && (
              <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {titleError}
              </span>
            )}
          </div>

          {/* Question Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-sm text-slate-700">Description / Admin Notes (Optional)</label>
            <textarea
              value={questionDescription}
              onChange={(e) => {
                if (e.target.value.length <= MAX_QUESTION_DESCRIPTION_LENGTH) {
                  setQuestionDescription(e.target.value);
                  clearFieldError("description");
                }
              }}
              placeholder="Provide internal notes or additional instructions..."
              maxLength={MAX_QUESTION_DESCRIPTION_LENGTH}
              className={`w-full min-h-[90px] p-3.5 border rounded-xl text-[14px] font-medium outline-none focus:ring-4 transition-all resize-y break-words ${
                errors.description
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                  : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/10"
              }`}
              style={{ overflowWrap: "anywhere" }}
            />
            <div className="flex justify-between items-start gap-3 text-xs font-medium">
              <span className="text-slate-400">
                {errors.description ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.description}
                  </span>
                ) : (
                  "This description is only visible to you in the dashboard."
                )}
              </span>
              <span className={questionDescription.length >= MAX_QUESTION_DESCRIPTION_LENGTH ? 'text-rose-600 font-bold shrink-0' : 'text-slate-400 shrink-0'}>
                {questionDescription.length} / {MAX_QUESTION_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          {/* Question Type Selection */}
          <QuestionTypeSelector value={questionType} onChange={handleQuestionTypeChange} />

          {/* Product Selection Mode Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-slate-700">Product Recommendation Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleProductSelectionTypeChange("single")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  productSelectionType === "single" 
                    ? "bg-brand-600 border-brand-650 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Single Product per Answer
              </button>
              <button
                type="button"
                onClick={() => handleProductSelectionTypeChange("multiple")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  productSelectionType === "multiple" 
                    ? "bg-brand-600 border-brand-650 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Multiple Products per Answer
              </button>
            </div>
          </div>

          {/* Option Type Selector (Radio & Checkbox only) */}
          {(questionType === "RADIO" || questionType === "CHECKBOX") && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-slate-700">Answer Display Layout</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOptionTypeChange("text")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                    optionType === "text" 
                      ? "bg-brand-600 border-brand-650 text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Standard Text Options
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionTypeChange("image")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                    optionType === "image" 
                      ? "bg-brand-600 border-brand-650 text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Visual Image Cards
                </button>
              </div>
            </div>
          )}

          {/* Answers & Mappings */}
          <div ref={optionsSectionRef}>
            <OptionsInput
              options={options}
              onChange={handleOptionsChange}
              optionType={optionType}
              productSelectionType={productSelectionType}
              showValidation={showValidation}
              optionsError={displayOptionsError}
              duplicateHighlightIndices={duplicateHighlightIndices}
              optionsErrorRef={optionsErrorRef}
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Question"}
          </button>
        </div>

      </div>

      {/* Safety Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[420px] w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <h3 className="text-[17px] font-bold text-slate-900">
              Confirm Mode Change?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              You are switching from multiple recommended products to single product mode. Mapped choices will retain only the first product, and additional products will be removed.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-150/60 hover:bg-slate-150 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={confirmToggleToSingle}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
