import type { ReactNode } from "react";

type ThemeEditorLinkProps = {
  url: string;
  className?: string;
  children: ReactNode;
  /** When true, opens in a new browser tab instead of navigating the embedded app frame. */
  openInNewTab?: boolean;
};

/** Opens Shopify Admin Theme Editor from an embedded app. */
export function ThemeEditorLink({
  url,
  className,
  children,
  openInNewTab = false,
}: ThemeEditorLinkProps) {
  return (
    <a
      href={url}
      target={openInNewTab ? "_blank" : "_top"}
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
