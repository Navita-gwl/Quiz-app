export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const QUESTION_TITLE_SOFT_MAX_LENGTH = 150;
export const QUESTION_TITLE_HARD_MAX_LENGTH = 191;
export const OPTION_LABEL_SOFT_MAX_LENGTH = 150;
export const OPTION_LABEL_HARD_MAX_LENGTH = 191;
export const MAX_QUESTION_DESCRIPTION_LENGTH = 450;

/** @deprecated Use QUESTION_TITLE_SOFT_MAX_LENGTH for display/validation thresholds */
export const MAX_QUESTION_TEXT_LENGTH = QUESTION_TITLE_SOFT_MAX_LENGTH;
/** @deprecated Use OPTION_LABEL_SOFT_MAX_LENGTH for display/validation thresholds */
export const MAX_OPTION_LABEL_LENGTH = OPTION_LABEL_SOFT_MAX_LENGTH;

export const QUESTION_TITLE_TOO_LONG_ERROR = "Question title is too long.";
export const OPTION_LABEL_TOO_LONG_ERROR = "Option label is too long.";
export const OPTION_LABEL_EMPTY_ERROR = "Option label cannot be empty.";
export const OPTION_IMAGE_EMPTY_ERROR = "Option image cannot be empty.";
export const OPTION_PRODUCT_REQUIRED_ERROR =
  "All options must have a recommended product selected";
export const OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR =
  "Option labels must be unique within the same question.";

export const OPTION_LABEL_DUPLICATE_ERRORS = new Set([
  OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR,
]);

export function getOptionLabelErrorKey(index: number): string {
  return `optionLabel_${index}`;
}

export function parseOptionLabelFieldErrors(
  errors: Record<string, string>
): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const match = key.match(/^optionLabel_(\d+)$/);
    if (match) {
      result[Number(match[1])] = message;
    }
  }
  return result;
}

export function stripOptionLabelFieldErrors(
  errors: Record<string, string>
): Record<string, string> {
  const next = { ...errors };
  for (const key of Object.keys(next)) {
    if (key.startsWith("optionLabel_")) {
      delete next[key];
    }
  }
  return next;
}

export function isOptionLabelDuplicateBannerError(message: string): boolean {
  return (
    OPTION_LABEL_DUPLICATE_ERRORS.has(message) ||
    message === "Option labels must be unique within the same question."
  );
}

export function isOptionInlineFieldError(message: string): boolean {
  return (
    message === OPTION_LABEL_TOO_LONG_ERROR ||
    message === OPTION_LABEL_EMPTY_ERROR ||
    message === OPTION_IMAGE_EMPTY_ERROR
  );
}

export function isOptionLabelEmpty(opt: unknown, optionType: "text" | "image" | string): boolean {
  if (normalizeOptionType(optionType) === "image") {
    return false;
  }
  if (typeof opt === "string") {
    return opt.trim() === "";
  }
  return getOptionLabel(opt).trim() === "";
}

export function isOptionImageEmpty(opt: unknown, optionType: "text" | "image" | string): boolean {
  if (normalizeOptionType(optionType) !== "image") {
    return false;
  }
  if (typeof opt === "string") {
    return opt.trim() === "";
  }
  if (!opt || typeof opt !== "object") {
    return true;
  }
  const imageSrc = (opt as { imageSrc?: unknown }).imageSrc;
  return typeof imageSrc !== "string" || imageSrc.trim() === "";
}

export function hasEmptyOptionLabels(
  options: any[],
  optionType: "text" | "image" | string
): boolean {
  const normalizedOptionType = normalizeOptionType(optionType);
  if (normalizedOptionType === "image") {
    return options.some((opt) => isOptionImageEmpty(opt, optionType));
  }
  return options.some((opt) => isOptionLabelEmpty(opt, optionType));
}

export function getOptionLabelDuplicateHighlightIndices(
  options: any[],
  optionType: "text" | "image" | string
): number[] {
  const withinQuestion = getWithinQuestionDuplicateOptionLabelErrors(options, optionType);
  return Object.keys(withinQuestion).map(Number);
}

export function promoteOptionLabelDuplicateErrorsToBanner(
  errors: Record<string, string>
): Record<string, string> {
  const next = stripOptionLabelFieldErrors(errors);
  const fieldErrors = parseOptionLabelFieldErrors(errors);

  if (next.options && isOptionLabelDuplicateBannerError(next.options)) {
    return next;
  }

  const duplicateMessage = Object.values(fieldErrors).find((message) =>
    OPTION_LABEL_DUPLICATE_ERRORS.has(message)
  );
  if (duplicateMessage) {
    next.options = duplicateMessage;
  }

  return next;
}

export function validateQuestionText(text: string): ValidationResult {
  if (!text || text.trim() === "") {
    return { isValid: false, error: "Question text is required" };
  }
  if (text.length > QUESTION_TITLE_SOFT_MAX_LENGTH) {
    return {
      isValid: false,
      error: QUESTION_TITLE_TOO_LONG_ERROR,
    };
  }
  return { isValid: true };
}

export function validateQuestionDescription(description: string): ValidationResult {
  if (description.length > MAX_QUESTION_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      error: `Description must be ${MAX_QUESTION_DESCRIPTION_LENGTH} characters or less.`,
    };
  }
  return { isValid: true };
}

export function isQuestionTitleTooLong(text: string): boolean {
  return text.trim() !== "" && text.length > QUESTION_TITLE_SOFT_MAX_LENGTH;
}

export function isOptionLabelTooLong(label: string, optionType: string): boolean {
  const isImageOptions = normalizeOptionType(optionType) === "image";
  const shouldValidateLength = !isImageOptions || label.trim() !== "";
  return shouldValidateLength && label.length > OPTION_LABEL_SOFT_MAX_LENGTH;
}

export function hasOverLengthOptionLabels(
  options: any[],
  optionType: string
): boolean {
  for (const opt of options) {
    const label = getOptionLabel(opt);
    if (isOptionLabelTooLong(label, optionType)) {
      return true;
    }
  }
  return false;
}

function normalizeOptionType(optionType: unknown): "text" | "image" {
  return optionType === "image" ? "image" : "text";
}

function getOptionLabel(opt: unknown): string {
  if (typeof opt === "string") return opt;
  if (opt && typeof opt === "object" && "label" in opt) {
    const label = (opt as { label?: unknown }).label;
    return typeof label === "string" ? label : "";
  }
  return "";
}

function normalizeOptionLabelForUniqueness(label: string): string {
  return label.trim().toLowerCase();
}

export function getComparableOptionLabel(
  opt: unknown,
  optionType: "text" | "image" | string
): string {
  const normalizedOptionType = normalizeOptionType(optionType);
  const label = getOptionLabel(opt).trim();
  if (!label) return "";
  if (normalizedOptionType === "image") {
    return normalizeOptionLabelForUniqueness(label);
  }
  return normalizeOptionLabelForUniqueness(label);
}

export function getWithinQuestionDuplicateOptionLabelErrors(
  options: any[],
  optionType: "text" | "image" | string
): Record<number, string> {
  const errors: Record<number, string> = {};
  const seen = new Map<string, number>();

  options.forEach((opt, index) => {
    const comparable = getComparableOptionLabel(opt, optionType);
    if (!comparable) return;

    if (seen.has(comparable)) {
      const firstIndex = seen.get(comparable)!;
      errors[firstIndex] = OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR;
      errors[index] = OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR;
    } else {
      seen.set(comparable, index);
    }
  });

  return errors;
}

export function validateQuestionOptions(
  options: any[],
  optionType: "text" | "image" | string
): ValidationResult {
  const normalizedOptionType = normalizeOptionType(optionType);
  const isImageOptions = normalizedOptionType === "image";

  if (!options || !Array.isArray(options) || options.length < 2) {
    return { isValid: false, error: "At least 2 options are required" };
  }

  // 1. Empty option check
  for (const opt of options) {
    if (typeof opt === "string") {
      if (opt.trim() === "") {
        return {
          isValid: false,
          error: isImageOptions ? OPTION_IMAGE_EMPTY_ERROR : OPTION_LABEL_EMPTY_ERROR,
        };
      }
    } else if (opt && typeof opt === "object") {
      if (isImageOptions) {
        const hasImage = typeof opt.imageSrc === "string" && opt.imageSrc.trim() !== "";
        if (!hasImage) {
          return {
            isValid: false,
            error: OPTION_IMAGE_EMPTY_ERROR,
          };
        }
      } else {
        const hasLabel = typeof opt.label === "string" && opt.label.trim() !== "";
        if (!hasLabel) {
          return {
            isValid: false,
            error: OPTION_LABEL_EMPTY_ERROR,
          };
        }
      }
    }
  }

  // 2. Label length check
  for (const opt of options) {
    const label = getOptionLabel(opt);
    const shouldValidateLength = !isImageOptions || label.trim() !== "";

    if (shouldValidateLength && label.length > OPTION_LABEL_SOFT_MAX_LENGTH) {
      return {
        isValid: false,
        error: OPTION_LABEL_TOO_LONG_ERROR,
      };
    }
  }

  // 3. Duplicate option check (within the same question)
  const duplicateFieldErrors = getWithinQuestionDuplicateOptionLabelErrors(
    options,
    normalizedOptionType
  );
  if (Object.keys(duplicateFieldErrors).length > 0) {
    return {
      isValid: false,
      error: OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR,
    };
  }

  return { isValid: true };
}

export function validateOptionProducts(options: any[]): ValidationResult {
  if (!options || !Array.isArray(options)) {
    return { isValid: false, error: "Options are required" };
  }

  const missingProduct = options.some((opt) => {
    if (typeof opt === "string") return true;
    const hasProducts = Array.isArray(opt.products) && opt.products.length > 0;
    const hasProductId = typeof opt.productId === "string" && opt.productId.trim() !== "";
    return !hasProducts && !hasProductId;
  });

  if (missingProduct) {
    return {
      isValid: false,
      error: OPTION_PRODUCT_REQUIRED_ERROR,
    };
  }

  return { isValid: true };
}

export function validateQuestionOptionsComplete(
  options: any[],
  optionType: "text" | "image" | string
): ValidationResult {
  const optionsResult = validateQuestionOptions(options, optionType);
  if (!optionsResult.isValid) return optionsResult;

  return validateOptionProducts(options);
}

export function collectQuestionFormErrors(params: {
  text: string;
  description: string;
  options: any[];
  optionType: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const normalizedOptionType = normalizeOptionType(params.optionType);

  const textResult = validateQuestionText(params.text);
  if (!textResult.isValid && textResult.error) {
    errors.text = textResult.error;
  }

  const descriptionResult = validateQuestionDescription(params.description);
  if (!descriptionResult.isValid && descriptionResult.error) {
    errors.description = descriptionResult.error;
  }

  if (params.options.length < 2) {
    errors.options = "At least 2 options are required";
  } else {
    const optionsResult = validateQuestionOptionsComplete(params.options, normalizedOptionType);
    if (!optionsResult.isValid && optionsResult.error) {
      if (
        optionsResult.error === OPTION_LABEL_TOO_LONG_ERROR ||
        isOptionLabelDuplicateBannerError(optionsResult.error) ||
        isOptionInlineFieldError(optionsResult.error)
      ) {
        // Inline field errors handle these cases.
      } else {
        errors.options = optionsResult.error;
      }
    }

    const withinDuplicateErrors = getWithinQuestionDuplicateOptionLabelErrors(
      params.options,
      normalizedOptionType
    );
    if (Object.keys(withinDuplicateErrors).length > 0) {
      errors.options = OPTION_LABEL_DUPLICATE_IN_QUESTION_ERROR;
    }
  }

  return errors;
}

export function mapPrismaValidationErrors(error: unknown): Record<string, string> | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2000"
  ) {
    const column = String((error as { meta?: { column_name?: string } }).meta?.column_name ?? "")
      .toLowerCase()
      .replace(/^question\./, "");

    if (column === "text") {
      return {
        text: QUESTION_TITLE_TOO_LONG_ERROR,
      };
    }

    if (column === "description") {
      return {
        description: `Description must be ${MAX_QUESTION_DESCRIPTION_LENGTH} characters or less.`,
      };
    }

    return {
      text: QUESTION_TITLE_TOO_LONG_ERROR,
    };
  }

  return null;
}
