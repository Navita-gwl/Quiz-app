/** Default storefront copy — extend by adding keys here and in TRANSLATION_FIELD_GROUPS */
export const DEFAULT_QUIZ_TRANSLATIONS: Record<string, string> = {
  "navigation.previous": "Previous",
  "navigation.back": "Back",
  "navigation.next": "Next",
  "navigation.start": "Start Quiz",
  "navigation.submit": "Submit Answers",
  "navigation.submitting": "Submitting...",
  "navigation.startOver": "Start Over",

  "form.heading": "Take our Quiz!",
  "form.subheading": "Please enter your details to start",
  "form.nameLabel": "Name",
  "form.emailLabel": "Email",
  "form.namePlaceholder": "Your Name",
  "form.emailPlaceholder": "your@email.com",
  "form.validation.nameRequired": "Please enter your name.",
  "form.validation.emailRequired": "Please enter your email address.",
  "form.validation.emailInvalid": "Please enter a valid email address.",

  "validation.selectOption": "Please select an option to continue.",
  "validation.selectAtLeastOne": "Please select at least one option to continue.",
  "validation.maxSelectionsHint": "You can select up to {max} options.",
  "validation.selectionLimit": "You can only select up to {max} option(s).",

  "progress.questionOf": "Question {current} of {total}",
  "progress.percentCompleted": "{percent}% Completed",

  "loading.default": "Loading quiz...",
  "loading.missingQuizId":
    "Add your 8-character Quiz ID in the Theme Editor Quiz block settings.",
  "loading.noQuestions": "No questions available at the moment.",
  "errors.loadFailed": "Unable to load quiz. Please try again later.",
  "errors.submitFailed": "Unable to submit your answers. Please try again.",

  "results.thankYouHeading": "Thank you for your answers!",
  "results.thankYouBody": "We will get back to you",
  "results.recommendationHeading": "Recommended for you",
  "results.recommendationSubheading": "",
  "results.addToCart": "Add to cart",
  "results.adding": "Adding...",
  "results.added": "Added! ✓",
  "results.addError": "Error!",
  "results.viewProduct": "View Product",
  "results.noImage": "No image",

  "dropdown.selectOption": "Select an option...",
  "dropdown.selectOptions": "Select options...",
  "dropdown.selectMultipleHint": "Tap each option to select or deselect",
  "dropdown.optionsSelected": "{count} selected",
  "dropdown.imagesSelected": "{count} image(s) selected",
};

/** Maps legacy flat settings keys to translation keys (backward compatibility) */
export const LEGACY_SETTINGS_TO_TRANSLATION_KEY: Record<string, string> = {
  formHeading: "form.heading",
  formSubheading: "form.subheading",
  startButtonText: "navigation.start",
  submitButtonText: "navigation.submit",
  prevButtonText: "navigation.previous",
  nextButtonText: "navigation.next",
  thankYouHeading: "results.thankYouHeading",
  thankYouBody: "results.thankYouBody",
  nameFieldLabel: "form.nameLabel",
  emailFieldLabel: "form.emailLabel",
  namePlaceholder: "form.namePlaceholder",
  emailPlaceholder: "form.emailPlaceholder",
  recommendationHeading: "results.recommendationHeading",
  recommendationSubheading: "results.recommendationSubheading",
  addToCartButtonText: "results.addToCart",
};

/** Reverse map for syncing resolved translations back to legacy flat keys */
export const TRANSLATION_KEY_TO_LEGACY_SETTINGS: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_SETTINGS_TO_TRANSLATION_KEY).map(([flat, key]) => [key, flat]),
);

export type TranslationFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
};

export type TranslationGroupId =
  | "navigation"
  | "lead-form"
  | "quiz-questions"
  | "progress-loading"
  | "results-products";

export type TranslationFieldGroup = {
  id: TranslationGroupId;
  group: string;
  shortLabel: string;
  fields: TranslationFieldDef[];
};

export const TRANSLATION_FIELD_GROUPS: TranslationFieldGroup[] = [
  {
    id: "navigation",
    group: "Navigation",
    shortLabel: "Navigation",
    fields: [
      { key: "navigation.previous", label: "Previous button" },
      { key: "navigation.back", label: "Back button" },
      { key: "navigation.next", label: "Next button" },
      { key: "navigation.start", label: "Start quiz button" },
      { key: "navigation.submit", label: "Submit answers button" },
      { key: "navigation.submitting", label: "Submitting label" },
      { key: "navigation.startOver", label: "Start over button" },
    ],
  },
  {
    id: "lead-form",
    group: "Lead form",
    shortLabel: "Lead Form",
    fields: [
      { key: "form.heading", label: "Form heading" },
      { key: "form.subheading", label: "Form subheading" },
      { key: "form.nameLabel", label: "Name field label" },
      { key: "form.emailLabel", label: "Email field label" },
      { key: "form.namePlaceholder", label: "Name placeholder" },
      { key: "form.emailPlaceholder", label: "Email placeholder" },
      { key: "form.validation.nameRequired", label: "Name required error" },
      { key: "form.validation.emailRequired", label: "Email required error" },
      { key: "form.validation.emailInvalid", label: "Email invalid error" },
    ],
  },
  {
    id: "quiz-questions",
    group: "Quiz questions",
    shortLabel: "Questions",
    fields: [
      { key: "validation.selectOption", label: "Single-select validation" },
      { key: "validation.selectAtLeastOne", label: "Multi-select validation" },
      {
        key: "validation.maxSelectionsHint",
        label: "Max selections hint",
        hint: "Use {max} for the limit number",
      },
      {
        key: "validation.selectionLimit",
        label: "Selection limit error",
        hint: "Use {max} for the limit number",
      },
      { key: "dropdown.selectOption", label: "Dropdown placeholder (single)" },
      { key: "dropdown.selectOptions", label: "Dropdown placeholder (multi)" },
      {
        key: "dropdown.selectMultipleHint",
        label: "Multi dropdown hint",
        hint: "Shown at the top of the open dropdown list",
      },
      {
        key: "dropdown.optionsSelected",
        label: "Options selected count",
        hint: "Use {count} for the number selected",
      },
      {
        key: "dropdown.imagesSelected",
        label: "Dropdown images selected",
        hint: "Use {count} for the number of images",
      },
    ],
  },
  {
    id: "progress-loading",
    group: "Progress & loading",
    shortLabel: "Progress",
    fields: [
      {
        key: "progress.questionOf",
        label: "Progress text",
        hint: "Use {current} and {total}",
      },
      {
        key: "progress.percentCompleted",
        label: "Percent completed",
        hint: "Use {percent}",
      },
      { key: "loading.default", label: "Loading message" },
      { key: "loading.missingQuizId", label: "Missing quiz ID error" },
      { key: "loading.noQuestions", label: "No questions message" },
      { key: "errors.loadFailed", label: "Load failed error" },
      { key: "errors.submitFailed", label: "Submit failed error" },
    ],
  },
  {
    id: "results-products",
    group: "Results & products",
    shortLabel: "Results",
    fields: [
      { key: "results.thankYouHeading", label: "Thank you heading" },
      { key: "results.thankYouBody", label: "Thank you body" },
      { key: "results.recommendationHeading", label: "Recommendations heading" },
      { key: "results.recommendationSubheading", label: "Recommendations subheading" },
      { key: "results.addToCart", label: "Add to cart button" },
      { key: "results.adding", label: "Adding to cart label" },
      { key: "results.added", label: "Added to cart label" },
      { key: "results.addError", label: "Add to cart error label" },
      { key: "results.viewProduct", label: "View product link" },
      { key: "results.noImage", label: "No product image label" },
    ],
  },
];

export function interpolateTranslation(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}

/** Merge defaults, legacy flat keys, and per-quiz translations JSON */
export function getResolvedTranslations(
  settings: Record<string, unknown> = {},
): Record<string, string> {
  const resolved: Record<string, string> = { ...DEFAULT_QUIZ_TRANSLATIONS };

  for (const [flatKey, translationKey] of Object.entries(LEGACY_SETTINGS_TO_TRANSLATION_KEY)) {
    const val = settings[flatKey];
    if (typeof val === "string" && val.trim() !== "") {
      resolved[translationKey] = val;
    }
  }

  const custom = settings.translations;
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    for (const [key, val] of Object.entries(custom as Record<string, unknown>)) {
      if (typeof val === "string" && val.trim() !== "") {
        resolved[key] = val;
      }
    }
  }

  return resolved;
}

/** Attach resolved translations and sync legacy flat keys for storefront consumers */
export function resolveQuizSettings<T extends Record<string, unknown>>(settings: T): T & {
  translations: Record<string, string>;
} {
  const translations = getResolvedTranslations(settings);
  const resolved = { ...settings, translations } as T & { translations: Record<string, string> };

  for (const [translationKey, flatKey] of Object.entries(TRANSLATION_KEY_TO_LEGACY_SETTINGS)) {
    (resolved as Record<string, unknown>)[flatKey] = translations[translationKey];
  }

  return resolved;
}

export function formatTranslation(
  translations: Record<string, string>,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const template = translations[key] ?? DEFAULT_QUIZ_TRANSLATIONS[key] ?? "";
  return interpolateTranslation(template, vars);
}
