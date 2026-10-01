import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  ensureGoogleFontsLoaded,
  getTypographyFontGroups,
  getTypographyFontLabel,
  groupTypographyFonts,
  QUIZ_TYPOGRAPHY_FONTS,
  resolveTypographyFont,
  searchTypographyFonts,
} from "../utils/quizFonts";

type TypographyFamilyPickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export function TypographyFamilyPicker({ value, onChange, id }: TypographyFamilyPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredFonts = useMemo(() => {
    const results = searchTypographyFonts(query);
    if (!FONT_VALUE_SET.has(value)) {
      const custom = resolveTypographyFont(value);
      const normalized = query.trim().toLowerCase();
      const customMatches =
        !normalized ||
        custom.label.toLowerCase().includes(normalized) ||
        custom.group.toLowerCase().includes(normalized);
      if (customMatches) {
        return [custom, ...results.filter((font) => font.value !== value)];
      }
    }
    return results;
  }, [query, value]);

  const groupedFonts = useMemo(() => groupTypographyFonts(filteredFonts), [filteredFonts]);
  const groupOrder = useMemo(() => {
    const knownGroups = getTypographyFontGroups();
    return [
      ...knownGroups.filter((group) => groupedFonts.has(group)),
      ...[...groupedFonts.keys()].filter((group) => !knownGroups.includes(group)),
    ];
  }, [groupedFonts]);

  useEffect(() => {
    ensureGoogleFontsLoaded(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    ensureGoogleFontsLoaded(nextValue);
    setOpen(false);
    setQuery("");
  };

  const handlePreviewFont = (fontValue: string) => {
    ensureGoogleFontsLoaded(fontValue);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all flex items-center justify-between gap-2"
        style={{ fontFamily: value || "inherit" }}
      >
        <span className="truncate text-left">{getTypographyFontLabel(value)}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts..."
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </div>

          <div
            role="listbox"
            aria-label="Typography family"
            className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
          >
            {filteredFonts.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">No fonts match your search.</div>
            ) : (
              groupOrder.map((group) => {
                const fonts = groupedFonts.get(group);
                if (!fonts?.length) return null;

                return (
                  <div key={group} className="mb-1 last:mb-0">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {group}
                    </div>
                    {fonts.map((font) => {
                      const isSelected = font.value === value;
                      return (
                        <button
                          key={font.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => handlePreviewFont(font.value)}
                          onFocus={() => handlePreviewFont(font.value)}
                          onClick={() => handleSelect(font.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? "bg-brand-50 text-brand-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                          style={{ fontFamily: font.value }}
                        >
                          <span className="truncate">{font.label}</span>
                          {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FONT_VALUE_SET = new Set(QUIZ_TYPOGRAPHY_FONTS.map((font) => font.value));
