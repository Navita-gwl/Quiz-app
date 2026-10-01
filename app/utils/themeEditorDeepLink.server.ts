/** Matches `extensions/quiz-extension/blocks/quiz.liquid` for addAppBlockId. */
export const QUIZ_THEME_BLOCK_HANDLE = "quiz";

export type ThemeEditorDeepLinkOptions = {
  /** JSON template handle, e.g. index, product, collection. Defaults to index. */
  template?: string;
  /** Where Shopify should insert the app block. Defaults to new Apps section. */
  target?: "newAppsSection" | "mainSection";
};

/**
 * Deep link that opens the Theme Editor with the QuizInsights Quiz app block ready to add.
 * @see https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking
 */
export function buildQuizBlockThemeEditorUrl(
  shop: string,
  options: ThemeEditorDeepLinkOptions = {},
): string | null {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  if (!apiKey || !shop) {
    return null;
  }

  const storeHandle = shop.replace(/\.myshopify\.com$/i, "");
  const params = new URLSearchParams({
    template: options.template ?? "index",
    addAppBlockId: `${apiKey}/${QUIZ_THEME_BLOCK_HANDLE}`,
    target: options.target ?? "newAppsSection",
  });

  return `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/themes/current/editor?${params.toString()}`;
}
