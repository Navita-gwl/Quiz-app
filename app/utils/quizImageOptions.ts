export function isImageSourceValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/")
  );
}

export function getImageOptionValue(opt: unknown): string {
  if (typeof opt === "string") {
    return isImageSourceValue(opt) ? opt.trim() : "";
  }
  if (!opt || typeof opt !== "object") return "";

  const imageSrc =
    typeof (opt as { imageSrc?: string }).imageSrc === "string"
      ? (opt as { imageSrc?: string }).imageSrc!.trim()
      : "";
  if (imageSrc) return imageSrc;

  const label =
    typeof (opt as { label?: string }).label === "string"
      ? (opt as { label?: string }).label!.trim()
      : "";
  if (isImageSourceValue(label)) return label;

  return "";
}

export function getImageOptionLabel(opt: unknown): string {
  if (!opt || typeof opt !== "object") return "";

  const label =
    typeof (opt as { label?: string }).label === "string"
      ? (opt as { label?: string }).label!.trim()
      : "";

  if (!label || isImageSourceValue(label)) return "";
  return label;
}

export function getImageOptionDisplayText(opt: unknown, index: number): string {
  const label = getImageOptionLabel(opt);
  if (label) return label;
  return `Option ${index + 1}`;
}

export function findImageOptionIndex(
  rawOptions: unknown[],
  value: string
): number {
  return rawOptions.findIndex((opt) => getImageOptionValue(opt) === value);
}

export function getImageOptionLabelByValue(
  rawOptions: unknown[],
  value: string,
  fallbackIndex = 0
): string {
  const idx = findImageOptionIndex(rawOptions, value);
  if (idx >= 0) {
    const label = getImageOptionLabel(rawOptions[idx]);
    if (label) return label;
    return `Option ${idx + 1}`;
  }
  return `Option ${fallbackIndex + 1}`;
}

export function getImageLabelLayoutMode(
  layout?: string
): "stack" | "inline-left" | "inline-right" {
  if (layout === "stack") return "stack";
  if (layout === "inline-left") return "inline-left";
  if (layout === "inline" || layout === "inline-right") return "inline-right";
  return "inline-right";
}

export function getImageCardSizeValue(value?: string): string {
  const sizes: Record<string, string> = {
    small: "100px",
    medium: "132px",
    large: "168px",
    "extra-small": "100px",
  };
  return sizes[value || "large"] || sizes.large;
}

export function getImageLabelLayoutClass(layout?: string): string {
  const mode = getImageLabelLayoutMode(layout);
  if (mode === "stack") return "gwl-quiz-image-label-stack";
  if (mode === "inline-left") return "gwl-quiz-image-label-inline-left";
  return "gwl-quiz-image-label-inline-right";
}
