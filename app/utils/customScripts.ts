const FORBIDDEN_JS_PATTERNS: { pattern: string; message: string }[] = [
  {
    pattern: "document.body",
    message:
      "Custom JavaScript cannot change the page body. Use the quiz container element to target this quiz only.",
  },
  {
    pattern: "window.",
    message:
      "Custom JavaScript cannot access the browser window. Use the quiz container element to interact with this quiz only.",
  },
  {
    pattern: "document.querySelector('body')",
    message:
      "Custom JavaScript cannot change the page body. Use the quiz container element to target this quiz only.",
  },
  {
    pattern: 'document.querySelector("body")',
    message:
      "Custom JavaScript cannot change the page body. Use the quiz container element to target this quiz only.",
  },
  {
    pattern: "document.getElementById('body')",
    message:
      "Custom JavaScript cannot change the page body. Use the quiz container element to target this quiz only.",
  },
  {
    pattern: 'document.getElementById("body")',
    message:
      "Custom JavaScript cannot change the page body. Use the quiz container element to target this quiz only.",
  },
];

export function validateJs(js: string): { valid: boolean; error?: string } {
  if (!js) return { valid: true };

  for (const { pattern, message } of FORBIDDEN_JS_PATTERNS) {
    if (js.includes(pattern)) {
      return { valid: false, error: message };
    }
  }

  return { valid: true };
}

export function normalizeQuizCssSelectors(css: string): string {
  if (!css) return "";

  let normalized = css.replace(/(^|[\s,{])(gwl-quiz-[a-zA-Z0-9_-]+)/g, (match, prefix, className, offset) => {
    const charBefore = offset > 0 ? css[offset - 1] : "";
    if (charBefore === ".") return match;
    return `${prefix}.${className}`;
  });

  normalized = normalized.replace(
    /\.gwl-quiz-container\s+\.gwl-quiz-theme-premium/g,
    ".gwl-quiz-container.gwl-quiz-theme-premium",
  );

  return normalized;
}

export function scopeCss(css: string): string {
  if (!css) return "";
  const normalized = normalizeQuizCssSelectors(css);
  return normalized.replace(/(?:\s*|^)([^@{}]+)(?=\s*{)/g, (match, selector) => {
    const trimmed = selector.trim();
    if (
      trimmed.startsWith(".gwl-quiz-container") ||
      trimmed.startsWith("#gwl-quiz-") ||
      trimmed.startsWith("html") ||
      trimmed.startsWith("body") ||
      trimmed.startsWith(":root")
    ) {
      return match;
    }
    return `${match.startsWith("\n") ? "\n" : ""}.gwl-quiz-container ${trimmed}`;
  });
}

export function ensureCssOverridesWin(css: string): string {
  if (!css) return "";
  return css.replace(/(^|\n)(\s*)([a-zA-Z-]+)\s*:\s*([^;]+);/g, (match, prefix, indent, prop, value) => {
    if (value.includes("!important")) return match;
    return `${prefix}${indent}${prop}: ${value.trim()} !important;`;
  });
}

export function buildScopedQuizCss(css: string, containerId: string): string {
  if (!css) return "";
  const normalized = normalizeQuizCssSelectors(css);
  const containerSelector = `#${containerId}.gwl-quiz-container`;
  const scoped = normalized.replace(/\.gwl-quiz-container(?![a-zA-Z0-9_-])/g, containerSelector);
  return ensureCssOverridesWin(scoped);
}
