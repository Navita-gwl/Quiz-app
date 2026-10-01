export type QuizTypographyFont = {
  label: string;
  value: string;
  google?: string;
  weights?: string;
  group: string;
};

const DEFAULT_WEIGHTS = "wght@300;400;500;700";
const DISPLAY_WEIGHTS = "wght@400;700";

function googleFont(
  label: string,
  google: string,
  fallback: string,
  group: string,
  weights = DEFAULT_WEIGHTS,
): QuizTypographyFont {
  const needsQuotes = google.includes(" ");
  const primary = needsQuotes ? `'${google}'` : google;
  return {
    label,
    value: `${primary}, ${fallback}`,
    google,
    weights,
    group,
  };
}

/** Curated set of commonly used Google Fonts for quiz typography pickers. */
export const QUIZ_TYPOGRAPHY_FONTS: QuizTypographyFont[] = [
  { label: "Store Body Default", value: "system-ui, -apple-system, sans-serif", group: "System" },

  // Sans-serif
  googleFont("Inter", "Inter", "sans-serif", "Sans-serif"),
  googleFont("Roboto", "Roboto", "sans-serif", "Sans-serif"),
  googleFont("Open Sans", "Open Sans", "sans-serif", "Sans-serif"),
  googleFont("Lato", "Lato", "sans-serif", "Sans-serif"),
  googleFont("Montserrat", "Montserrat", "sans-serif", "Sans-serif"),
  googleFont("Poppins", "Poppins", "sans-serif", "Sans-serif"),
  googleFont("Raleway", "Raleway", "sans-serif", "Sans-serif"),
  googleFont("Nunito", "Nunito", "sans-serif", "Sans-serif"),
  googleFont("Oswald", "Oswald", "sans-serif", "Sans-serif"),
  googleFont("Source Sans 3", "Source Sans 3", "sans-serif", "Sans-serif"),
  googleFont("DM Sans", "DM Sans", "sans-serif", "Sans-serif"),
  googleFont("Work Sans", "Work Sans", "sans-serif", "Sans-serif"),
  googleFont("Rubik", "Rubik", "sans-serif", "Sans-serif"),
  googleFont("Mulish", "Mulish", "sans-serif", "Sans-serif"),
  googleFont("Fira Sans", "Fira Sans", "sans-serif", "Sans-serif"),
  googleFont("Karla", "Karla", "sans-serif", "Sans-serif"),
  googleFont("Manrope", "Manrope", "sans-serif", "Sans-serif"),
  googleFont("Outfit", "Outfit", "sans-serif", "Sans-serif"),
  googleFont("Figtree", "Figtree", "sans-serif", "Sans-serif"),
  googleFont("Plus Jakarta Sans", "Plus Jakarta Sans", "sans-serif", "Sans-serif"),
  googleFont("IBM Plex Sans", "IBM Plex Sans", "sans-serif", "Sans-serif"),
  googleFont("Ubuntu", "Ubuntu", "sans-serif", "Sans-serif"),
  googleFont("Noto Sans", "Noto Sans", "sans-serif", "Sans-serif"),
  googleFont("Quicksand", "Quicksand", "sans-serif", "Sans-serif"),
  googleFont("Lexend", "Lexend", "sans-serif", "Sans-serif"),
  googleFont("Barlow", "Barlow", "sans-serif", "Sans-serif"),
  googleFont("Josefin Sans", "Josefin Sans", "sans-serif", "Sans-serif"),
  googleFont("PT Sans", "PT Sans", "sans-serif", "Sans-serif"),

  // Serif
  googleFont("Playfair Display", "Playfair Display", "serif", "Serif", DISPLAY_WEIGHTS),
  googleFont("Merriweather", "Merriweather", "serif", "Serif"),
  googleFont("Lora", "Lora", "serif", "Serif"),
  googleFont("PT Serif", "PT Serif", "serif", "Serif"),
  googleFont("Libre Baskerville", "Libre Baskerville", "serif", "Serif"),
  googleFont("Crimson Text", "Crimson Text", "serif", "Serif"),
  googleFont("EB Garamond", "EB Garamond", "serif", "Serif"),
  googleFont("Bitter", "Bitter", "serif", "Serif"),
  googleFont("Source Serif 4", "Source Serif 4", "serif", "Serif"),
  googleFont("Cormorant Garamond", "Cormorant Garamond", "serif", "Serif"),
  googleFont("Noto Serif", "Noto Serif", "serif", "Serif"),
  googleFont("Spectral", "Spectral", "serif", "Serif"),
  googleFont("Cardo", "Cardo", "serif", "Serif"),

  // Display
  googleFont("Bebas Neue", "Bebas Neue", "sans-serif", "Display", DISPLAY_WEIGHTS),
  googleFont("Anton", "Anton", "sans-serif", "Display", DISPLAY_WEIGHTS),
  googleFont("Archivo Black", "Archivo Black", "sans-serif", "Display", DISPLAY_WEIGHTS),
  googleFont("Alfa Slab One", "Alfa Slab One", "serif", "Display", DISPLAY_WEIGHTS),

  // Handwriting & script
  googleFont("Pacifico", "Pacifico", "cursive", "Handwriting", DISPLAY_WEIGHTS),
  googleFont("Dancing Script", "Dancing Script", "cursive", "Handwriting"),
  googleFont("Great Vibes", "Great Vibes", "cursive", "Handwriting", DISPLAY_WEIGHTS),
  googleFont("Lobster", "Lobster", "cursive", "Handwriting", DISPLAY_WEIGHTS),
  googleFont("Caveat", "Caveat", "cursive", "Handwriting"),
  googleFont("Satisfy", "Satisfy", "cursive", "Handwriting", DISPLAY_WEIGHTS),
  googleFont("Sacramento", "Sacramento", "cursive", "Handwriting", DISPLAY_WEIGHTS),

  // Monospace
  googleFont("Roboto Mono", "Roboto Mono", "monospace", "Monospace"),
  googleFont("Source Code Pro", "Source Code Pro", "monospace", "Monospace"),
  googleFont("Fira Code", "Fira Code", "monospace", "Monospace"),
  googleFont("IBM Plex Mono", "IBM Plex Mono", "monospace", "Monospace"),
  googleFont("JetBrains Mono", "JetBrains Mono", "monospace", "Monospace"),
];

const FONT_BY_VALUE = new Map(QUIZ_TYPOGRAPHY_FONTS.map((font) => [font.value, font]));

const TYPOGRAPHY_FONT_GROUPS = [...new Set(QUIZ_TYPOGRAPHY_FONTS.map((font) => font.group))];

export function getTypographyFontGroups(): string[] {
  return TYPOGRAPHY_FONT_GROUPS;
}

export function getTypographyFontsByGroup(group: string): QuizTypographyFont[] {
  return QUIZ_TYPOGRAPHY_FONTS.filter((font) => font.group === group);
}

export function getTypographyFontLabel(value?: string): string {
  if (!value) return "Store Body Default";
  const known = FONT_BY_VALUE.get(value);
  if (known) return known.label;
  const parsed = parseGoogleFontName(value);
  return parsed || "Custom font";
}

export function resolveTypographyFont(value?: string): QuizTypographyFont {
  const fallback = QUIZ_TYPOGRAPHY_FONTS[0];
  if (!value) return fallback;
  const known = FONT_BY_VALUE.get(value);
  if (known) return known;
  return {
    label: getTypographyFontLabel(value),
    value,
    group: "Custom",
  };
}

export function searchTypographyFonts(query: string): QuizTypographyFont[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return QUIZ_TYPOGRAPHY_FONTS;
  return QUIZ_TYPOGRAPHY_FONTS.filter(
    (font) =>
      font.label.toLowerCase().includes(normalized) ||
      font.group.toLowerCase().includes(normalized),
  );
}

export function groupTypographyFonts(fonts: QuizTypographyFont[]): Map<string, QuizTypographyFont[]> {
  const grouped = new Map<string, QuizTypographyFont[]>();
  for (const font of fonts) {
    const list = grouped.get(font.group) ?? [];
    list.push(font);
    grouped.set(font.group, list);
  }
  return grouped;
}

function parseGoogleFontName(fontFamily?: string): string | null {
  if (!fontFamily || fontFamily === "inherit" || fontFamily.includes("system-ui")) {
    return null;
  }
  const primary = fontFamily.split(",")[0]?.trim();
  if (!primary) return null;
  return primary.replace(/^['"]|['"]$/g, "");
}

export function getGoogleFontSpec(fontFamily?: string): string | null {
  if (!fontFamily) return null;

  const known = FONT_BY_VALUE.get(fontFamily);
  if (known?.google) {
    const weights = known.weights || DEFAULT_WEIGHTS;
    return `family=${encodeURIComponent(known.google).replace(/%20/g, "+")}:${weights}`;
  }

  const parsed = parseGoogleFontName(fontFamily);
  if (!parsed) return null;
  return `family=${encodeURIComponent(parsed).replace(/%20/g, "+")}:${DEFAULT_WEIGHTS}`;
}

export function buildGoogleFontsUrl(...fontFamilies: (string | undefined)[]): string | null {
  const specs = [...new Set(fontFamilies.map(getGoogleFontSpec).filter(Boolean))] as string[];
  if (specs.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${specs.join("&")}&display=swap`;
}

export function ensureGoogleFontsLoaded(...fontFamilies: (string | undefined)[]): void {
  if (typeof document === "undefined") return;

  const url = buildGoogleFontsUrl(...fontFamilies);
  const linkId = "gwl-quiz-google-fonts";
  const existing = document.getElementById(linkId) as HTMLLinkElement | null;

  if (!url) {
    existing?.remove();
    return;
  }

  if (existing) {
    if (existing.href !== url) existing.href = url;
    return;
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}
