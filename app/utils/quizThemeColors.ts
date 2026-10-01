type ThemeSettings = Record<string, unknown>;

const DEFAULT_BG = "#ffffff";
const DEFAULT_TEXT = "#111111";

/** Resolve per-screen theme colors from merged settings (no cross-screen inheritance). */
export function resolveThemeColors(settings: ThemeSettings) {
  const formBg = (settings.formBackgroundColor as string) || DEFAULT_BG;
  const formText = (settings.formTextColor as string) || DEFAULT_TEXT;
  const quizBg = (settings.quizBackgroundColor as string) || DEFAULT_BG;
  const quizText = (settings.quizTextColor as string) || DEFAULT_TEXT;
  const thankYouBg = (settings.thankYouBackgroundColor as string) || quizBg;
  const thankYouText = (settings.thankYouTextColor as string) || quizText;

  return { formBg, formText, quizBg, quizText, thankYouBg, thankYouText };
}
