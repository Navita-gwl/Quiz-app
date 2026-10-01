import { useState } from "react";
import { Languages } from "lucide-react";
import {
  TRANSLATION_FIELD_GROUPS,
  DEFAULT_QUIZ_TRANSLATIONS,
  getResolvedTranslations,
  type TranslationGroupId,
} from "../utils/quizTranslations";

interface QuizTranslationsEditorProps {
  globalSettings: Record<string, unknown>;
  overrides: Record<string, unknown>;
  onTranslationChange: (key: string, value: string) => void;
  quizTitle?: string;
}

export function QuizTranslationsEditor({
  globalSettings,
  overrides,
  onTranslationChange,
  quizTitle,
}: QuizTranslationsEditorProps) {
  const [activeGroupId, setActiveGroupId] = useState<TranslationGroupId>(
    TRANSLATION_FIELD_GROUPS[0].id,
  );

  const mergedSettings = { ...globalSettings, ...overrides };
  const resolved = getResolvedTranslations(mergedSettings);
  const activeGroup =
    TRANSLATION_FIELD_GROUPS.find((group) => group.id === activeGroupId) ??
    TRANSLATION_FIELD_GROUPS[0];

  const handleGroupChange = (groupId: TranslationGroupId) => {
    setActiveGroupId(groupId);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
        <Languages className="w-4.5 h-4.5 text-indigo-600" /> Translations & Labels
      </div>

      <p className="text-[12px] text-slate-500 leading-relaxed -mt-2">
        {quizTitle ? (
          <>
            Customize button text, messages, and labels shown to shoppers on the{" "}
            <span className="font-bold text-slate-700">{quizTitle}</span> quiz. Changes here
            override the global defaults for this quiz only.
          </>
        ) : (
          <>
            Customize button text, messages, and labels shown to shoppers. Changes here override
            the global defaults for this quiz only.
          </>
        )}{" "}
        Dynamic values such as{" "}
        <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{`{current}`}</code> or{" "}
        <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{`{total}`}</code> are
        filled in automatically on the storefront.
      </p>

      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-1.5">
        <div className="flex flex-wrap gap-1">
          {TRANSLATION_FIELD_GROUPS.map((group) => {
            const isActive = activeGroupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleGroupChange(group.id)}
                className={`inline-flex flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0 sm:flex-none items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white"
                }`}
              >
                <span>{group.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {activeGroup.group}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {activeGroup.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-650">{field.label}</label>
              <input
                type="text"
                value={resolved[field.key] ?? ""}
                placeholder={DEFAULT_QUIZ_TRANSLATIONS[field.key]}
                onChange={(e) => onTranslationChange(field.key, e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
              {field.hint && (
                <span className="text-[10px] text-slate-400 font-medium">{field.hint}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
