import { useState, useCallback, useEffect, useRef, type Ref } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Plus, Minus, Image, Upload, X, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";
import {
  OPTION_LABEL_HARD_MAX_LENGTH,
  OPTION_LABEL_TOO_LONG_ERROR,
  OPTION_LABEL_EMPTY_ERROR,
  OPTION_IMAGE_EMPTY_ERROR,
  isOptionLabelTooLong,
  isOptionLabelEmpty,
  isOptionImageEmpty,
} from "../utils/validation";
import { toUserFacingError } from "../utils/userFacingErrors";

export interface OptionItem {
  label?: string;
  imageSrc?: string;
  productId?: string;
  productHandle?: string;
  productTitle?: string;
  productImage?: string;
  products?: Array<{
    productId: string;
    productTitle: string;
    productImage: string;
    productHandle: string;
  }>;
}

interface OptionsInputProps {
  options: OptionItem[];
  onChange: (options: OptionItem[]) => void;
  optionType: "text" | "image";
  productSelectionType?: "single" | "multiple";
  showValidation?: boolean;
  optionsError?: string;
  duplicateHighlightIndices?: number[];
  optionsErrorRef?: Ref<HTMLDivElement>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export function normaliseOptions(raw: unknown): OptionItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ label: "" }];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((s) => ({ label: s }));
  }
  return (raw as OptionItem[]).map((opt) => {
    let products = opt.products;
    if (!products && opt.productId) {
      products = [{
        productId: opt.productId,
        productTitle: opt.productTitle || "",
        productImage: opt.productImage || "",
        productHandle: opt.productHandle || "",
      }];
    }
    return {
      label: opt.label,
      imageSrc: opt.imageSrc,
      productId: opt.productId,
      productHandle: opt.productHandle,
      productTitle: opt.productTitle,
      productImage: opt.productImage,
      products: products || [],
    };
  });
}

export function OptionsInput({
  options,
  onChange,
  optionType,
  productSelectionType,
  showValidation = false,
  optionsError,
  duplicateHighlightIndices = [],
  optionsErrorRef,
}: OptionsInputProps) {
  const duplicateHighlightSet = new Set(duplicateHighlightIndices);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replacingState, setReplacingState] = useState<Record<number, boolean>>({});
  const shopify = useAppBridge();

  useEffect(() => {
    if (!uploadError) {
      if (uploadErrorTimerRef.current) {
        clearTimeout(uploadErrorTimerRef.current);
        uploadErrorTimerRef.current = null;
      }
      return;
    }

    if (uploadErrorTimerRef.current) {
      clearTimeout(uploadErrorTimerRef.current);
    }

    uploadErrorTimerRef.current = setTimeout(() => {
      setUploadError(null);
      uploadErrorTimerRef.current = null;
    }, 5000);

    return () => {
      if (uploadErrorTimerRef.current) {
        clearTimeout(uploadErrorTimerRef.current);
        uploadErrorTimerRef.current = null;
      }
    };
  }, [uploadError]);

  const updateOption = (index: number, patch: Partial<OptionItem>) => {
    const next = options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt));
    onChange(next);
  };

  const selectProduct = async (index: number) => {
    try {
      const isSingle = productSelectionType === "single";
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: !isSingle,
      });

      if (selected && selected.length > 0) {
        const nextProducts = selected.map((prod: any) => {
          const productImage = prod.images?.[0]?.originalSrc || prod.images?.[0]?.src || "";
          return {
            productId: prod.id,
            productTitle: prod.title,
            productImage: productImage,
            productHandle: prod.handle,
          };
        });

        const primary = nextProducts[0];

        if (isSingle) {
          updateOption(index, {
            productId: primary.productId,
            productHandle: primary.productHandle,
            productTitle: primary.productTitle,
            productImage: primary.productImage,
            products: [primary],
          });
        } else {
          updateOption(index, {
            productId: primary.productId,
            productHandle: primary.productHandle,
            productTitle: primary.productTitle,
            productImage: primary.productImage,
            products: nextProducts,
          });
        }
      }
    } catch (error) {
      console.error("Error opening product picker:", error);
    }
  };

  const removeProduct = (index: number) => {
    const next = options.map((opt, i) => {
      if (i === index) {
        const { productId, productHandle, productTitle, productImage, products, ...rest } = opt;
        return {
          ...rest,
          products: []
        };
      }
      return opt;
    });
    onChange(next);
  };

  const removeSingleProduct = (optionIndex: number, productIndex: number) => {
    const option = options[optionIndex];
    if (!option.products) return;
    
    const nextProducts = option.products.filter((_, i) => i !== productIndex);
    
    if (nextProducts.length === 0) {
      updateOption(optionIndex, {
        productId: undefined,
        productHandle: undefined,
        productTitle: undefined,
        productImage: undefined,
        products: [],
      });
    } else {
      const primary = nextProducts[0];
      updateOption(optionIndex, {
        productId: primary.productId,
        productHandle: primary.productHandle,
        productTitle: primary.productTitle,
        productImage: primary.productImage,
        products: nextProducts,
      });
    }
  };

  const handleImageUpload = useCallback(
    async (index: number, file: File | null) => {
      if (!file) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError("Invalid file type. Allowed: jpg, png, gif, webp");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File size exceeds 5MB limit");
        return;
      }
      setUploadError(null);
      setUploadingIndex(index);

      try {
        const uploadFormData = new FormData();
        uploadFormData.append("image", file);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: uploadFormData,
        });

        const data = await response.json();

        if (!data.success || !data.url) {
          setUploadError(toUserFacingError(data.error, "Failed to upload image. Please try again."));
          setUploadingIndex(null);
          return;
        }

        updateOption(index, { imageSrc: data.url });
        setUploadingIndex(null);
        setReplacingState((prev) => ({ ...prev, [index]: false }));
      } catch (err) {
        console.error("Image upload error:", err);
        setUploadError("Upload failed. Please check your connection and try again.");
        setUploadingIndex(null);
      }
    },
    [options]
  );

  const addOption = () => onChange([...options, { label: "" }]);

  const removeOption = (index: number) => {
    if (options.length <= 1) return;
    const next = options.filter((_, i) => i !== index);
    const newReplacing = { ...replacingState };
    delete newReplacing[index];
    setReplacingState(newReplacing);
    onChange(next);
  };

  const toggleReplace = (index: number, val: boolean) =>
    setReplacingState((prev) => ({ ...prev, [index]: val }));

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex justify-between items-center">
        <label className="font-bold text-sm text-slate-700">Answer Options & Mapped Recommendations</label>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Choice
        </button>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {optionsError && (
        <div
          ref={optionsErrorRef}
          className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{optionsError}</span>
        </div>
      )}

      <div className="space-y-4">
        {options.map((option, index) => {
          let imageSrc = option.imageSrc ?? "";
          if (!imageSrc && option.label && (option.label.startsWith("http://") || option.label.startsWith("https://") || option.label.startsWith("data:image/"))) {
            imageSrc = option.label;
          }
          const hasImage = optionType === "image" && (
            imageSrc.startsWith("data:image/") ||
            imageSrc.startsWith("http://") ||
            imageSrc.startsWith("https://")
          );
          const isReplacing = replacingState[index];
          const showInput = !hasImage || isReplacing;
          const labelValue = option.label ?? "";
          const labelTooLong = isOptionLabelTooLong(labelValue, optionType);
          const labelEmpty =
            showValidation && isOptionLabelEmpty(option, optionType);
          const imageEmpty =
            showValidation && isOptionImageEmpty(option, optionType);
          const hasDuplicateHighlight = duplicateHighlightSet.has(index);
          const showLabelError = labelTooLong || labelEmpty || hasDuplicateHighlight;
          const labelErrorMessage = labelTooLong
            ? OPTION_LABEL_TOO_LONG_ERROR
            : labelEmpty
              ? OPTION_LABEL_EMPTY_ERROR
              : undefined;

          return (
            <div
              key={index}
              className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-4 shadow-xs relative group min-w-0"
            >
              {/* Option Index Header & Action Buttons */}
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Option #{index + 1}
                </span>
                
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                    title="Remove this option"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Label / Caption */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {optionType === "text" ? "Option Label" : "Label / Caption (Optional)"}
                  {optionType === "text" && <span className="text-rose-500 normal-case tracking-normal"> *</span>}
                </label>
                <input
                  type="text"
                  value={labelValue}
                  maxLength={OPTION_LABEL_HARD_MAX_LENGTH}
                  onChange={(e) =>
                    updateOption(index, {
                      label: e.target.value.slice(0, OPTION_LABEL_HARD_MAX_LENGTH),
                    })
                  }
                  placeholder={optionType === "text" ? `e.g. Option ${index + 1}` : "e.g. Add a label or caption to this image"}
                  className={`w-full min-w-0 h-11 px-3.5 border rounded-xl text-[14px] font-medium outline-none focus:ring-4 focus:ring-brand-500/10 transition-all bg-white ${
                    showLabelError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-250 focus:border-brand-500"
                  }`}
                />
                {showLabelError && labelErrorMessage && (
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {labelErrorMessage}
                  </span>
                )}
              </div>

              {/* Image upload (image options only) */}
              {optionType === "image" && (
                <div className="flex flex-col gap-3">
                  {imageEmpty && (
                    <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {OPTION_IMAGE_EMPTY_ERROR}
                    </span>
                  )}
                  {!showInput && (
                    <div className="flex items-center gap-4 p-3 bg-white border border-slate-200/60 rounded-xl">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200/80 bg-slate-50 flex-shrink-0">
                        <img
                          src={imageSrc}
                          alt="Option preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-500 flex-1">
                        Visual option selected
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleReplace(index, true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Replace Image
                      </button>
                    </div>
                  )}
                  {showInput && (
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={(e) =>
                            handleImageUpload(index, e.target.files?.[0] || null)
                          }
                          className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-250 cursor-pointer file:cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white"
                        />
                        {uploadingIndex === index && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-600 font-bold animate-pulse">
                            Uploading...
                          </span>
                        )}
                      </div>
                      {hasImage && (
                        <button
                          type="button"
                          onClick={() => toggleReplace(index, false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mapped Products Picker Section */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Recommend Product(s) <span className="text-rose-500">*</span>
                </label>

                {option.products && option.products.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {option.products.map((prod, pIdx) => (
                        <div
                          key={prod.productId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-full bg-white max-w-[280px] shadow-xs"
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center">
                            {prod.productImage ? (
                              <img
                                src={prod.productImage}
                                alt={prod.productTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] text-slate-400">N/A</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                            {prod.productTitle}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSingleProduct(index, pIdx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full transition-colors"
                            title="Remove product recommendation"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectProduct(index)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        {productSelectionType === "single" ? "Change Product" : "Manage Selections"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 p-3 border border-dashed border-slate-200 rounded-xl bg-white">
                    <span className="text-xs font-medium text-slate-400">
                      No recommended products mapped.
                    </span>
                    <button
                      type="button"
                      onClick={() => selectProduct(index)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                    >
                      Select Products
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
