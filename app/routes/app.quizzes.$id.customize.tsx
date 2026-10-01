import { useState, useEffect, useRef, useMemo } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate, Link } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncSubscription } from "../billing.server";
import { resolveFetcherError } from "../utils/userFacingErrors";
import { checkFeatureAccess } from "../feature";
import { ensureGoogleFontsLoaded } from "../utils/quizFonts";
import { resolveThemeColors } from "../utils/quizThemeColors";
import { buildScopedQuizCss, scopeCss, validateJs } from "../utils/customScripts";
import { TypographyFamilyPicker } from "../components/TypographyFamilyPicker";
import { QuizTranslationsEditor } from "../components/QuizTranslationsEditor";
import {
  ArrowLeft,
  Settings,
  Sliders,
  Eye,
  Layout,
  Check,
  Lock,
  Maximize2,
  Save,
  CheckSquare,
  UserCheck,
  PartyPopper,
  Palette,
  Languages,
  Code2,
} from "lucide-react";

type SettingsTabId = "form" | "quiz" | "thanks" | "accents" | "translations" | "advanced";

const SETTINGS_TABS: Array<{
  id: SettingsTabId;
  label: string;
  description: string;
  icon: typeof Layout;
}> = [
  {
    id: "form",
    label: "Lead Form",
    description: "Registration screen content, fields, and styling",
    icon: UserCheck,
  },
  {
    id: "quiz",
    label: "Questions",
    description: "Quiz flow, options layout, and question styling",
    icon: CheckSquare,
  },
  {
    id: "thanks",
    label: "Completion",
    description: "Thank-you screen copy and styling",
    icon: PartyPopper,
  },
  {
    id: "accents",
    label: "Accents",
    description: "Global colors, corners, and button sizing",
    icon: Palette,
  },
  {
    id: "translations",
    label: "Translations",
    description: "Locale-specific label overrides",
    icon: Languages,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Custom CSS and JavaScript overrides",
    icon: Code2,
  },
];

const DEFAULT_SETTINGS = {
  formHeading: "Take our Quiz!",
  formSubheading: "Please enter your details to start",
  startButtonText: "Start Quiz",
  submitButtonText: "Submit Answers",
  thankYouHeading: "Thank you for your answers!",
  thankYouBody: "We will get back to you",
  registrationFormPosition: "before_quiz",
  showNameField: true,
  showEmailField: true,
  showProgressBar: true,
  showQuestionNumbers: true,
  quizPrimaryColor: "#111827",
  buttonTextColor: "#ffffff",
  quizTextColor: "#111111",
  quizBorderRadius: "10px",
  enableLeadForm: true,
  quizDisplayMode: "step",
  formTextColor: "#111111",
  formBackgroundColor: "#ffffff",
  formFontSize: "14px",
  formFontFamily: "system-ui, -apple-system, sans-serif",
  formFontWeight: "normal",
  formFontStyle: "normal",
  formContentAlignment: "left",
  quizBackgroundColor: "#ffffff",
  quizFontSize: "14px",
  quizFontFamily: "system-ui, -apple-system, sans-serif",
  quizFontWeight: "normal",
  quizFontStyle: "normal",
  quizContentAlignment: "left",
  thankYouBackgroundColor: "#ffffff",
  thankYouTextColor: "#111111",
  thankYouContentAlignment: "left",
  customCss: "",
  customJs: "",
  autoAdvanceOnRadio: true,
  navigationButtonSize: "small",
  optionsPerRow: "1",
  optionInputStyle: "styled",
  imageShape: "square",
  imageCardSize: "large",
  imageLabelLayout: "inline-right",
  imageWidth: "medium",
  imageHeight: "medium",
  imageOptionsPerRow: "",
  selectionBackground: "enable",
  optionSelectionBgColor: "",
};

function normalizeOptionsPerRowValue(value: string | undefined): "1" | "auto" {
  if (!value || value === "1") return "1";
  if (value === "auto") return "auto";
  return "auto";
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const quizId = params.id;

  if (!quizId) {
    throw new Response("This quiz link is invalid.", { status: 400 });
  }

  const category = await db.category.findUnique({
    where: { id: quizId },
  });

  if (!category || category.shopId !== session.shop) {
    throw new Response("Quiz not found", { status: 404 });
  }

  const globalSettings = await db.quizSettings.findUnique({
    where: { shopId: session.shop },
  });

  const mergedGlobal = { ...DEFAULT_SETTINGS };
  if (globalSettings) {
    for (const key in DEFAULT_SETTINGS) {
      const val = (globalSettings as any)[key];
      if (val !== null && val !== undefined) {
        (mergedGlobal as any)[key] = val;
      }
    }
  }
  mergedGlobal.customCss = "";
  mergedGlobal.customJs = "";

  const currentPlan = await syncSubscription(admin, session.shop);

  const [questionCount, responseCount] = await Promise.all([
    db.question.count({
      where: { shopId: session.shop, categoryId: quizId },
    }),
    db.quizSubmission.count({
      where: { shopId: session.shop, categoryId: quizId },
    }),
  ]);

  return {
    quiz: {
      id: category.id,
      title: category.title,
      overrides: (category.settings as any) || {},
      questionCount,
      responseCount,
    },
    globalSettings: mergedGlobal,
    currentPlan,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const quizId = params.id;

  if (!quizId) {
    return Response.json({ success: false, error: "Missing quiz ID" }, { status: 400 });
  }

  const category = await db.category.findUnique({
    where: { id: quizId },
  });

  if (!category || category.shopId !== session.shop) {
    return Response.json({ success: false, error: "Quiz not found" }, { status: 404 });
  }

  const currentPlan = await syncSubscription(admin, session.shop);
  const hasCustomCssAccess = checkFeatureAccess(currentPlan, "customCss");
  const hasCustomJsAccess = checkFeatureAccess(currentPlan, "customJs");

  const { overrides } = await request.json();

  const cleanOverrides: any = {};
  const deprecatedKeys = ["imageOptionsPerRow", "imageWidth", "imageHeight"];
  for (const key in overrides) {
    if (deprecatedKeys.includes(key)) continue;
    const value = overrides[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      if (key === "translations" && Object.keys(value as object).length === 0) continue;
      cleanOverrides[key] = value;
      continue;
    }
    if (value === "" && typeof value !== "boolean") continue;
    cleanOverrides[key] = value;
  }

  if (cleanOverrides.optionsPerRow) {
    cleanOverrides.optionsPerRow = normalizeOptionsPerRowValue(cleanOverrides.optionsPerRow);
  }

  if (cleanOverrides.customCss !== undefined) {
    if (!hasCustomCssAccess) {
      delete cleanOverrides.customCss;
    } else {
      cleanOverrides.customCss = scopeCss(cleanOverrides.customCss);
    }
  }

  if (cleanOverrides.customJs !== undefined) {
    if (!hasCustomJsAccess) {
      delete cleanOverrides.customJs;
    } else {
      const validation = validateJs(cleanOverrides.customJs);
      if (!validation.valid) {
        return Response.json({ success: false, error: validation.error }, { status: 400 });
      }
    }
  }

  const updated = await db.category.update({
    where: { id: quizId },
    data: {
      settings: cleanOverrides,
    },
  });

  return Response.json({ success: true, overrides: updated.settings });
};

export default function CustomizeQuiz() {
  const { quiz, globalSettings, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const headerActionsRef = useRef<HTMLDivElement>(null);

  const [initialOverrides, setInitialOverrides] = useState<any>(quiz.overrides || {});
  const [overrides, setOverrides] = useState<any>(quiz.overrides || {});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showStickySave, setShowStickySave] = useState(false);
  const [expandedField, setExpandedField] = useState<{
    key: "customCss" | "customJs";
    title: string;
    placeholder: string;
  } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>("form");
  const [previewTab, setPreviewTab] = useState<"form" | "quiz" | "thanks">("form");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeSettingsTab) ?? SETTINGS_TABS[0];

  const hasCustomCssAccess = checkFeatureAccess(currentPlan, "customCss");
  const hasCustomJsAccess = checkFeatureAccess(currentPlan, "customJs");
  const isStarter = currentPlan === "STARTER";

  const isDirty = JSON.stringify(initialOverrides) !== JSON.stringify(overrides);

  useEffect(() => {
    if (!shopify.tools?.register) {
      return;
    }

    const cleanup = shopify.tools.register("summarize_open_quiz", async () => ({
      results: [
        {
          url: `app://app/quizzes/${quiz.id}/customize`,
          _meta: {
            quizId: quiz.id,
            title: quiz.title,
            questionCount: quiz.questionCount,
            responseCount: quiz.responseCount,
          },
        },
      ],
    }));

    return cleanup;
  }, [shopify, quiz.id, quiz.title, quiz.questionCount, quiz.responseCount]);

  useEffect(() => {
    const headerEl = headerActionsRef.current;
    if (!headerEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickySave(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-8px 0px 0px 0px" },
    );

    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fetcher.data?.success) {
      const savedOverrides = fetcher.data.overrides ?? overrides;
      setInitialOverrides(savedOverrides);
      setOverrides(savedOverrides);
      setShowSuccess(true);
      shopify.toast.show("Settings saved");
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
    if (fetcher.data?.success === false) {
      shopify.toast.show(
        resolveFetcherError(fetcher.data, "We couldn't save these quiz settings. Please try again.") ||
          "We couldn't save these quiz settings. Please try again.",
        { isError: true }
      );
    }
  }, [fetcher.data]);

  const handleFieldChange = (key: string, value: any) => {
    setOverrides((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTranslationChange = (key: string, value: string) => {
    setOverrides((prev: any) => {
      const nextTranslations = { ...(prev.translations || {}) };
      if (!value.trim()) {
        delete nextTranslations[key];
      } else {
        nextTranslations[key] = value;
      }
      const next = { ...prev };
      if (Object.keys(nextTranslations).length > 0) {
        next.translations = nextTranslations;
      } else {
        delete next.translations;
      }
      return next;
    });
  };

  const handleSave = () => {
    fetcher.submit(
      { overrides },
      {
        method: "post",
        encType: "application/json",
      }
    );
  };

  const handleDiscard = () => {
    setOverrides(initialOverrides);
  };

  const handleResetToDefault = () => {
    setIsResetModalOpen(false);
    setOverrides({});
    fetcher.submit(
      { overrides: {} },
      {
        method: "post",
        encType: "application/json",
      }
    );
  };

  const isSaving = fetcher.state !== "idle";

  const renderSaveButton = (className = "") => (
    <button
      type="button"
      onClick={handleSave}
      disabled={!isDirty || isSaving}
      className={`inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Save className="w-4 h-4 mr-1.5" /> {isSaving ? "Saving..." : "Save Settings"}
    </button>
  );

  const getActiveValue = (key: string) => {
    if (key === "customCss" || key === "customJs") {
      return overrides[key] ?? "";
    }
    return overrides[key] !== undefined ? overrides[key] : (globalSettings as any)[key];
  };

  const themeColors = useMemo(() => {
    const merged = { ...globalSettings, ...overrides };
    return resolveThemeColors(merged);
  }, [globalSettings, overrides]);

  const previewTheme =
    previewTab === "form"
      ? { backgroundColor: themeColors.formBg, color: themeColors.formText }
      : previewTab === "thanks"
        ? { backgroundColor: themeColors.thankYouBg, color: themeColors.thankYouText }
        : { backgroundColor: themeColors.quizBg, color: themeColors.quizText };

  useEffect(() => {
    ensureGoogleFontsLoaded(
      getActiveValue("formFontFamily"),
      getActiveValue("quizFontFamily"),
    );
  }, [overrides, globalSettings]);

  const handleSettingsTabChange = (tabId: SettingsTabId) => {
    setActiveSettingsTab(tabId);
    if (tabId === "form" || tabId === "quiz" || tabId === "thanks") {
      setPreviewTab(tabId);
    } else {
      setPreviewTab("form");
    }
  };

  const handlePreviewTabChange = (tab: "form" | "quiz" | "thanks") => {
    setPreviewTab(tab);
    const tabMap: Record<typeof tab, SettingsTabId> = {
      form: "form",
      quiz: "quiz",
      thanks: "thanks",
    };
    setActiveSettingsTab(tabMap[tab]);
  };

  const navBtnSizing = {
    small: { height: '40px', minWidth: '140px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '48px', minWidth: '160px', padding: '0 24px', fontSize: '16px' },
    large: { height: '56px', minWidth: '180px', padding: '0 28px', fontSize: '18px' }
  };

  const navSizeKey = getActiveValue("navigationButtonSize") || 'medium';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.medium;

  const FieldHeader = ({ label, isPremium, settingKey, action }: { label: string; settingKey?: string; isPremium?: boolean; action?: React.ReactNode }) => {
    const isFieldDisabled = isPremium && (
      settingKey === "customCss" ? !hasCustomCssAccess :
        settingKey === "customJs" ? !hasCustomJsAccess :
          !isStarter
    );
    return (
      <div className="flex justify-between items-center w-full mb-1.5">
        <label className="text-xs font-bold text-slate-650">{label}</label>
        {action}
        {isFieldDisabled && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Premium
          </span>
        )}
      </div>
    );
  };

  return (
    <s-page heading="Customize Quiz" inlineSize="large">
      <div className={`min-h-screen bg-slate-50/50 font-sans ${showStickySave && isDirty ? "pb-28" : "pb-20"}`}>

        {/* Navigation & Header Actions */}
        <div className="px-6 pt-6 pb-4 max-w-[1700px] mx-auto">
          <div className="mb-4">
            <button
              onClick={() => navigate(`/app/questions?quizId=${quiz.id}`)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </div>

          <div ref={headerActionsRef} className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Sliders className="w-6 h-6 text-brand-600" /> Customize Theme Overrides
              </h1>
              <p className="text-sm text-slate-500 mt-1">Override default styles specifically for <span className="font-bold text-slate-700">"{quiz.title}"</span>.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-100 hover:bg-rose-100/80 hover:border-rose-200 text-rose-600 shadow-sm transition-all"
              >
                Reset Overrides
              </button>
              {renderSaveButton()}
            </div>
          </div>

          {showSuccess && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-bold flex items-center gap-2 shadow-xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settings saved for this quiz.</span>
            </div>
          )}
        </div>

        {/* Settings tab navigation */}
        <div className="px-6 max-w-[1700px] mx-auto mb-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-thin">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSettingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSettingsTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/40">
              <p className="text-xs font-semibold text-slate-600">{activeTabMeta.description}</p>
            </div>
          </div>
        </div>

        {/* Split Layout Container */}
        <div className="px-6 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Settings Override Forms (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-6">

            {activeSettingsTab === "form" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Layout className="w-4.5 h-4.5 text-indigo-600" /> Registration Form
              </div>

              {/* Content & Text */}
              <div className="flex flex-col gap-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Content & Labels</div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Form Header Heading" settingKey="formHeading" />
                  <input
                    type="text"
                    value={getActiveValue("formHeading")}
                    onChange={(e) => handleFieldChange("formHeading", e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Form Subtext Description" settingKey="formSubheading" />
                  <input
                    type="text"
                    value={getActiveValue("formSubheading")}
                    onChange={(e) => handleFieldChange("formSubheading", e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Start Button Text" settingKey="startButtonText" />
                  <input
                    type="text"
                    value={getActiveValue("startButtonText")}
                    onChange={(e) => handleFieldChange("startButtonText", e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Form Settings */}
              <div className="flex flex-col gap-4 border-t border-slate-50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Form Placement & Fields</div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Form Screen Placement" settingKey="registrationFormPosition" />
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={getActiveValue("registrationFormPosition")}
                    onChange={(e) => handleFieldChange("registrationFormPosition", e.target.value)}
                  >
                    <option value="before_quiz">Before Quiz Questions</option>
                    <option value="after_quiz">After Quiz Questions</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3.5 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Enable Customer Lead Form</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("enableLeadForm")}
                      onChange={(e) => handleFieldChange("enableLeadForm", e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Display Customer Name Input</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("showNameField")}
                      disabled={!getActiveValue("enableLeadForm")}
                      onChange={(e) => handleFieldChange("showNameField", e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Display Customer Email Input</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("showEmailField")}
                      disabled={!getActiveValue("enableLeadForm")}
                      onChange={(e) => handleFieldChange("showEmailField", e.target.checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Form Custom Styling */}
              <div className="flex flex-col gap-4 border-t border-slate-50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Styling Overrides</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Form Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("formBackgroundColor")}
                        onChange={(e) => handleFieldChange("formBackgroundColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("formBackgroundColor")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Form Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("formTextColor")}
                        onChange={(e) => handleFieldChange("formTextColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("formTextColor")}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                      <span>Form Font Size</span>
                      <span className="font-mono text-brand-600">{getActiveValue("formFontSize")}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                      <input
                        type="range"
                        min="8"
                        max="50"
                        value={parseInt(getActiveValue("formFontSize")) || 14}
                        onChange={(e) => handleFieldChange("formFontSize", e.target.value + "px")}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">px</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Form Typography Family</label>
                    <TypographyFamilyPicker
                      value={getActiveValue("formFontFamily")}
                      onChange={(nextValue) => handleFieldChange("formFontFamily", nextValue)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Form Typography Weight</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("formFontWeight") || "normal"}
                      onChange={(e) => handleFieldChange("formFontWeight", e.target.value)}
                    >
                      <option value="300">Light (300)</option>
                      <option value="normal">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="bold">Bold (700)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Form Alignment</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("formContentAlignment") || "left"}
                      onChange={(e) => handleFieldChange("formContentAlignment", e.target.value)}
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeSettingsTab === "quiz" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Layout className="w-4.5 h-4.5 text-indigo-600" /> Questions view
              </div>

              {/* Quiz Experience */}
              <div className="flex flex-col gap-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quiz UX Settings</div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Answer Control Style" settingKey="optionInputStyle" />
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={getActiveValue("optionInputStyle") || "styled"}
                    onChange={(e) => handleFieldChange("optionInputStyle", e.target.value)}
                  >
                    <option value="styled">Styled cards (recommended)</option>
                    <option value="native">Standard radio, checkbox &amp; dropdown</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Choose styled answer cards or standard browser controls for radio, checkbox, and dropdown questions.
                  </p>
                </div>

                <div className="flex flex-col gap-3.5 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Display Progress Bar</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("showProgressBar")}
                      onChange={(e) => handleFieldChange("showProgressBar", e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Display Step Numbers</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("showQuestionNumbers")}
                      onChange={(e) => handleFieldChange("showQuestionNumbers", e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Auto Advance on Single Choice Select</span>
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                      checked={getActiveValue("autoAdvanceOnRadio")}
                      onChange={(e) => handleFieldChange("autoAdvanceOnRadio", e.target.checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Display Layout Mode</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("quizDisplayMode")}
                      onChange={(e) => handleFieldChange("quizDisplayMode", e.target.value)}
                    >
                      <option value="step">One question per step</option>
                      <option value="2">Two questions per step</option>
                      <option value="3">Three questions per step</option>
                      <option value="all">All questions single screen</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Submit Button Label</label>
                    <input
                      type="text"
                      value={getActiveValue("submitButtonText")}
                      onChange={(e) => handleFieldChange("submitButtonText", e.target.value)}
                      className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-650">Options Per Row</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all sm:max-w-md"
                    value={normalizeOptionsPerRowValue(getActiveValue("optionsPerRow"))}
                    onChange={(e) => handleFieldChange("optionsPerRow", e.target.value)}
                  >
                    <option value="1">One per line</option>
                    <option value="auto">Inline as per width</option>
                  </select>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
                    Applies to all question types (text, radio, checkbox, dropdown, and image cards). Inline mode fits as many options per row as the available width allows.
                  </p>
                </div>
              </div>

              {/* Image Visual Card */}
              <div className="flex flex-col gap-4 border-t border-slate-50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Image Visual Card</div>

                <div className="flex flex-col gap-1.5 sm:max-w-md">
                  <label className="text-xs font-bold text-slate-650">Image Shape</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={getActiveValue("imageShape") || "square"}
                    onChange={(e) => handleFieldChange("imageShape", e.target.value)}
                  >
                    <option value="square">Square</option>
                    <option value="rectangle">Rectangle (16:9)</option>
                    <option value="rounded-square">Rounded Square</option>
                    <option value="circle">Circle</option>
                  </select>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Applies to image-based answer options. Images are automatically sized and cropped to fit the selected shape.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:max-w-md">
                  <label className="text-xs font-bold text-slate-650">Image Size</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={getActiveValue("imageCardSize") || "large"}
                    onChange={(e) => handleFieldChange("imageCardSize", e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Controls the display size of image answer cards. Labels stay centered below the image in stack layout.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:max-w-md">
                  <label className="text-xs font-bold text-slate-650">Label Layout</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={
                      getActiveValue("imageLabelLayout") === "inline"
                        ? "inline-right"
                        : getActiveValue("imageLabelLayout") || "inline-right"
                    }
                    onChange={(e) => handleFieldChange("imageLabelLayout", e.target.value)}
                  >
                    <option value="stack">Stack</option>
                    <option value="inline-right">Inline — label on right</option>
                    <option value="inline-left">Inline — label on left</option>
                  </select>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Stack centers the label below the image. Inline places the label beside the image on the left or right.
                  </p>
                </div>
              </div>

              {/* Question Styling */}
              <div className="flex flex-col gap-4 border-t border-slate-50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Styling Overrides</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Questions Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("quizBackgroundColor")}
                        onChange={(e) => handleFieldChange("quizBackgroundColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("quizBackgroundColor")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Questions Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("quizTextColor")}
                        onChange={(e) => handleFieldChange("quizTextColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("quizTextColor")}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                      <span>Questions Font Size</span>
                      <span className="font-mono text-brand-600">{getActiveValue("quizFontSize")}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                      <input
                        type="range"
                        min="8"
                        max="50"
                        value={parseInt(getActiveValue("quizFontSize")) || 14}
                        onChange={(e) => handleFieldChange("quizFontSize", e.target.value + "px")}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">px</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Questions Typography Family</label>
                    <TypographyFamilyPicker
                      value={getActiveValue("quizFontFamily")}
                      onChange={(nextValue) => handleFieldChange("quizFontFamily", nextValue)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Questions Typography Weight</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("quizFontWeight") || "normal"}
                      onChange={(e) => handleFieldChange("quizFontWeight", e.target.value)}
                    >
                      <option value="300">Light (300)</option>
                      <option value="normal">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="bold">Bold (700)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Questions Alignment</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("quizContentAlignment") || "left"}
                      onChange={(e) => handleFieldChange("quizContentAlignment", e.target.value)}
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Selected Option Fill Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("optionSelectionBgColor") || getActiveValue("quizPrimaryColor") || "#111827"}
                        onChange={(e) => handleFieldChange("optionSelectionBgColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("optionSelectionBgColor") || getActiveValue("quizPrimaryColor") || "#111827"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeSettingsTab === "thanks" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Layout className="w-4.5 h-4.5 text-indigo-600" /> Completion view
              </div>

              <div className="flex flex-col gap-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Screen</div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Thank You Title" settingKey="thankYouHeading" />
                  <input
                    type="text"
                    value={getActiveValue("thankYouHeading")}
                    onChange={(e) => handleFieldChange("thankYouHeading", e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldHeader label="Thank You Description Message" settingKey="thankYouBody" />
                  <input
                    type="text"
                    value={getActiveValue("thankYouBody")}
                    onChange={(e) => handleFieldChange("thankYouBody", e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Styling Overrides</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Completion Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("thankYouBackgroundColor") || getActiveValue("quizBackgroundColor") || "#ffffff"}
                        onChange={(e) => handleFieldChange("thankYouBackgroundColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">
                        {getActiveValue("thankYouBackgroundColor") || getActiveValue("quizBackgroundColor") || "#ffffff"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Completion Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("thankYouTextColor") || getActiveValue("quizTextColor") || "#111111"}
                        onChange={(e) => handleFieldChange("thankYouTextColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">
                        {themeColors.thankYouText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-bold text-slate-650">Completion Alignment</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={getActiveValue("thankYouContentAlignment") || "left"}
                    onChange={(e) => handleFieldChange("thankYouContentAlignment", e.target.value)}
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>
              </div>
            </div>
            )}

            {activeSettingsTab === "accents" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Settings className="w-4.5 h-4.5 text-indigo-600" /> Accent Styling Overrides
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Accent & Buttons Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("quizPrimaryColor")}
                        onChange={(e) => handleFieldChange("quizPrimaryColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("quizPrimaryColor")}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Button Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={getActiveValue("buttonTextColor")}
                        onChange={(e) => handleFieldChange("buttonTextColor", e.target.value)}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{getActiveValue("buttonTextColor")}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                      <span>Border Radius (Corners)</span>
                      <span className="font-mono text-brand-600">{getActiveValue("quizBorderRadius")}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={parseInt(getActiveValue("quizBorderRadius")) || 0}
                        onChange={(e) => handleFieldChange("quizBorderRadius", e.target.value + "px")}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">px</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Navigation Button Size</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={getActiveValue("navigationButtonSize")}
                      onChange={(e) => handleFieldChange("navigationButtonSize", e.target.value)}
                    >
                      <option value="small">Small size buttons</option>
                      <option value="medium">Medium size buttons</option>
                      <option value="large">Large size buttons</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeSettingsTab === "translations" && (
            <QuizTranslationsEditor
              globalSettings={globalSettings}
              overrides={overrides}
              onTranslationChange={handleTranslationChange}
              quizTitle={quiz.title}
            />
            )}

            {activeSettingsTab === "advanced" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Sliders className="w-4.5 h-4.5 text-indigo-600" /> Advanced Developer Scripts
              </div>

              <div className="flex flex-col gap-5">

                {/* Custom CSS overrides */}
                <div className="flex flex-col gap-2.5">
                  <FieldHeader
                    label="Custom Quiz CSS Overrides"
                    settingKey="customCss"
                    isPremium
                    action={hasCustomCssAccess && (
                      <button
                        type="button"
                        onClick={() => setExpandedField({
                          key: "customCss",
                          title: "Custom CSS overrides",
                          placeholder: "/* Custom CSS styles go here */",
                        })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                      </button>
                    )}
                  />
                  <textarea
                    disabled={!hasCustomCssAccess}
                    className={`w-full h-32 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all ${!hasCustomCssAccess
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-150'
                        : 'bg-slate-50 text-slate-800'
                      }`}
                    value={hasCustomCssAccess ? getActiveValue("customCss") : ""}
                    onChange={(e) => handleFieldChange("customCss", e.target.value)}
                    placeholder={hasCustomCssAccess ? "/* Custom CSS styles go here */" : "Upgrade subscription to override CSS stylesheet"}
                  />
                </div>

                {/* Custom JS overrides */}
                <div className="flex flex-col gap-2.5">
                  <FieldHeader
                    label="Custom Quiz JavaScript Overrides"
                    settingKey="customJs"
                    isPremium
                    action={hasCustomJsAccess && (
                      <button
                        type="button"
                        onClick={() => setExpandedField({
                          key: "customJs",
                          title: "Custom JavaScript overrides",
                          placeholder: "// Custom JavaScript script callback overrides"
                        })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                      </button>
                    )}
                  />
                  <textarea
                    disabled={!hasCustomJsAccess}
                    className={`w-full h-32 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all ${!hasCustomJsAccess
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-150'
                        : 'bg-slate-50 text-slate-800'
                      }`}
                    value={hasCustomJsAccess ? getActiveValue("customJs") : ""}
                    onChange={(e) => handleFieldChange("customJs", e.target.value)}
                    placeholder={hasCustomJsAccess ? "/* Custom JavaScript code goes here */" : "Upgrade subscription to override JS scripts"}
                  />
                </div>

              </div>
            </div>
            )}

          </div>

          {/* RIGHT COLUMN: Live Interactive Storefront Preview (6 cols) */}
          <div className="lg:col-span-6">
            <div className="sticky top-24">

              {/* Preview Tab Nav Bar */}
              <div className="flex items-center justify-between mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-500 ml-2 uppercase tracking-wide flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handlePreviewTabChange("form")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewTab === "form"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreviewTabChange("quiz")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewTab === "quiz"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreviewTabChange("thanks")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewTab === "thanks"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    Completion
                  </button>
                </div>
              </div>

              {/* Simulated Browser View Frame Container */}
              <div
                id={`gwl-quiz-${quiz.id}`}
                className="gwl-quiz-container overflow-hidden min-h-[480px] flex flex-col transition-all duration-300"
                style={{
                  backgroundColor: previewTheme.backgroundColor,
                  color: previewTheme.color,
                  fontFamily: previewTab === "form"
                    ? getActiveValue("formFontFamily")
                    : getActiveValue("quizFontFamily"),
                  fontSize: previewTab === "form"
                    ? getActiveValue("formFontSize")
                    : getActiveValue("quizFontSize"),
                  fontWeight: previewTab === "form"
                    ? getActiveValue("formFontWeight") || "normal"
                    : getActiveValue("quizFontWeight") || "normal",
                  fontStyle: "normal",
                  '--quiz-nav-btn-height': navSizing.height,
                  '--quiz-nav-btn-min-width': navSizing.minWidth,
                  '--quiz-nav-btn-padding': navSizing.padding,
                  '--quiz-nav-btn-font-size': navSizing.fontSize,
                  '--quiz-container-align': previewTab === "form"
                    ? (getActiveValue("formContentAlignment") || "left")
                    : previewTab === "thanks"
                      ? (getActiveValue("thankYouContentAlignment") || getActiveValue("quizContentAlignment") || "left")
                      : (getActiveValue("quizContentAlignment") || "left"),
                  '--quiz-option-selection-bg-color': getActiveValue("optionSelectionBgColor") || getActiveValue("quizPrimaryColor") || '#111827',
                  '--form-bg-color': themeColors.formBg,
                  '--form-text-color': themeColors.formText,
                  '--quiz-bg-color': themeColors.quizBg,
                  '--quiz-text-color': themeColors.quizText,
                  '--thank-you-bg-color': themeColors.thankYouBg,
                  '--thank-you-text-color': themeColors.thankYouText,
                } as React.CSSProperties}
              >
                {/* Custom CSS overrides stylesheet injection */}
                {hasCustomCssAccess && getActiveValue("customCss") && (
                  <style dangerouslySetInnerHTML={{
                    __html: buildScopedQuizCss(scopeCss(getActiveValue("customCss")), `gwl-quiz-${quiz.id}`)
                  }} />
                )}

                {/* Header browser navigation simulation bar */}
                <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex items-center gap-2 select-none">
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg text-[10px] text-slate-400 font-mono flex-1 text-center py-1.5 max-w-sm mx-auto shadow-xs select-none">
                    your-store.myshopify.com/apps/quiz
                  </div>
                </div>

                {/* Live Canvas Viewport */}
                <div className="flex-1 p-8 flex flex-col justify-center items-center">

                  {/* 1. Form */}
                  {previewTab === "form" && (
                    <div
                      className="gwl-quiz-registration-form w-full max-w-md flex flex-col gap-6"
                      style={{ textAlign: (getActiveValue("formContentAlignment") as any) || "left" }}
                    >
                      {getActiveValue("enableLeadForm") ? (
                        <>
                          <div className="gwl-quiz-header">
                            <h2 className="gwl-quiz-heading text-3xl font-extrabold tracking-tight mb-2" style={{ color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit', lineHeight: 1.2 }}>
                              {getActiveValue("formHeading")}
                            </h2>
                            <p className="gwl-quiz-subheading text-sm opacity-70 leading-relaxed" style={{ color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit' }}>
                              {getActiveValue("formSubheading")}
                            </p>
                          </div>

                          <div
                            className="flex flex-col gap-3.5"
                            style={{ textAlign: (getActiveValue("formContentAlignment") as any) || "left" }}
                          >
                            {getActiveValue("showNameField") && (
                              <div className="gwl-quiz-form-group flex flex-col gap-2">
                                <label className="text-[13px] font-semibold tracking-wide opacity-90" style={{ color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit' }}>Name</label>
                                <div
                                  className="gwl-quiz-input border-[1.5px] border-[#e2e8f0] px-4 h-[52px] flex items-center bg-white text-[15px] text-slate-400 select-none"
                                  style={{ borderRadius: getActiveValue("quizBorderRadius"), color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit' }}
                                >
                                  Your Name
                                </div>
                              </div>
                            )}

                            {getActiveValue("showEmailField") && (
                              <div className="gwl-quiz-form-group flex flex-col gap-2">
                                <label className="text-[13px] font-semibold tracking-wide opacity-90" style={{ color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit' }}>Email</label>
                                <div
                                  className="gwl-quiz-input border-[1.5px] border-[#e2e8f0] px-4 h-[52px] flex items-center bg-white text-[15px] text-slate-400 select-none"
                                  style={{ borderRadius: getActiveValue("quizBorderRadius"), color: getActiveValue("formTextColor"), fontFamily: getActiveValue("formFontFamily") || 'inherit' }}
                                >
                                  your@email.com
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className="gwl-quiz-submit-btn gwl-quiz-start-btn block font-semibold text-white mt-6 transition-all mx-auto duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                            style={{
                              backgroundColor: getActiveValue("quizPrimaryColor"),
                              color: getActiveValue("buttonTextColor") || "#ffffff",
                              borderRadius: getActiveValue("quizBorderRadius"),
                              border: "none",
                              fontFamily: getActiveValue("formFontFamily") || 'inherit',
                              height: "var(--quiz-nav-btn-height)",
                              minWidth: "var(--quiz-nav-btn-min-width)",
                              padding: "var(--quiz-nav-btn-padding)",
                              fontSize: "var(--quiz-nav-btn-font-size)",
                              boxSizing: "border-box",
                              boxShadow: `0 4px 12px ${getActiveValue("quizPrimaryColor")}28`,
                            }}
                          >
                            {getActiveValue("registrationFormPosition") === "after_quiz"
                              ? getActiveValue("submitButtonText")
                              : getActiveValue("startButtonText")
                            }
                          </button>
                        </>
                      ) : (
                        <div className="p-8 bg-slate-50 text-slate-400 text-sm text-center rounded-2xl border border-dashed border-slate-200 font-medium">
                          Lead collection form is currently disabled. Customers will bypass this panel.
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Questions */}
                  {previewTab === "quiz" && (
                    <div className="gwl-quiz-questions w-full max-w-md flex flex-col gap-4">
                      {/* ProgressBar */}
                      {getActiveValue("showProgressBar") && (
                        <div className="gwl-quiz-progress-container w-full flex flex-col gap-1.5 select-none">
                          <div className="gwl-quiz-progress-bg w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div
                              className="gwl-quiz-progress-bar h-full transition-all duration-300"
                              style={{
                                backgroundColor: getActiveValue("quizPrimaryColor"),
                                width: "40%",
                                borderRadius: getActiveValue("quizBorderRadius")
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Question card */}
                      <div
                        className="gwl-quiz-question-card"
                        style={{
                          textAlign: (getActiveValue("quizContentAlignment") as any) || "left",
                          backgroundColor: themeColors.quizBg,
                          color: themeColors.quizText,
                        }}
                      >
                        <div className="gwl-quiz-header">
                          {getActiveValue("showQuestionNumbers") && (
                            <div className="gwl-quiz-question-number text-[11px] font-bold tracking-wider opacity-45 mb-1.5 uppercase" style={{ color: themeColors.quizText }}>
                              Question 2 of 5
                            </div>
                          )}
                          <h3 className="gwl-quiz-heading text-[22px] font-extrabold mb-[24px] select-none leading-tight" style={{ color: themeColors.quizText, fontFamily: getActiveValue("quizFontFamily") || 'inherit' }}>
                            What skin type do you have?
                          </h3>
                        </div>

                        {/* Options list */}
                        {(() => {
                          const optionsPerRowVal = normalizeOptionsPerRowValue(getActiveValue("optionsPerRow"));
                          const isFitWidth = optionsPerRowVal === "auto";
                          return (
                            <div
                              className={`gwl-quiz-options gap-3 ${isFitWidth ? "flex flex-wrap" : "grid"}`}
                              style={isFitWidth
                                ? undefined
                                : {
                                    display: "grid",
                                    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                                  }}
                            >
                              <div
                                className={`gwl-quiz-option border-[1.5px] py-3 px-4.5 text-[15px] font-semibold cursor-pointer transition-all flex items-center gap-3 shadow-xs duration-250 ease-in-out ${getActiveValue("quizContentAlignment") === "center" ? "justify-center" :
                                    getActiveValue("quizContentAlignment") === "right" ? "justify-end" :
                                      "justify-start"
                                  }`}
                                style={{
                                  borderColor: getActiveValue("quizPrimaryColor"),
                                  borderRadius: getActiveValue("quizBorderRadius"),
                                  backgroundColor: `color-mix(in srgb, ${getActiveValue("quizPrimaryColor")} 4%, #ffffff)`,
                                  boxShadow: `0 4px 12px ${getActiveValue("quizPrimaryColor")}20`
                                }}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-white flex-shrink-0"
                                  style={{
                                    borderColor: getActiveValue("quizPrimaryColor"),
                                    backgroundColor: getActiveValue("quizPrimaryColor")
                                  }}
                                >
                                  <Check className="w-2 h-2 stroke-[3]" />
                                </span>
                                <span style={{ color: themeColors.quizText, fontFamily: getActiveValue("quizFontFamily") || 'inherit' }}>Oily or Acne-Prone</span>
                              </div>

                              <div
                                className={`gwl-quiz-option border-[1.5px] border-[rgba(0,0,0,0.05)] py-3 px-4.5 text-[15px] font-semibold cursor-pointer bg-white transition-all flex items-center gap-3 hover:bg-slate-50/50 duration-250 ease-in-out ${getActiveValue("quizContentAlignment") === "center" ? "justify-center" :
                                    getActiveValue("quizContentAlignment") === "right" ? "justify-end" :
                                      "justify-start"
                                  }`}
                                style={{
                                  borderRadius: getActiveValue("quizBorderRadius")
                                }}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-white flex-shrink-0" style={{ borderColor: `${themeColors.quizText}25` }}></span>
                                <span style={{ color: themeColors.quizText, opacity: 0.85, fontFamily: getActiveValue("quizFontFamily") || 'inherit' }}>Dry or Flaky</span>
                              </div>

                              <div
                                className={`gwl-quiz-option border-[1.5px] border-[rgba(0,0,0,0.05)] py-3 px-4.5 text-[15px] font-semibold cursor-pointer bg-white transition-all flex items-center gap-3 hover:bg-slate-50/50 duration-250 ease-in-out ${getActiveValue("quizContentAlignment") === "center" ? "justify-center" :
                                    getActiveValue("quizContentAlignment") === "right" ? "justify-end" :
                                      "justify-start"
                                  }`}
                                style={{
                                  borderRadius: getActiveValue("quizBorderRadius")
                                }}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-white flex-shrink-0" style={{ borderColor: `${themeColors.quizText}25` }}></span>
                                <span style={{ color: themeColors.quizText, opacity: 0.85, fontFamily: getActiveValue("quizFontFamily") || 'inherit' }}>Combination / Normal</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="gwl-quiz-nav flex justify-between mt-4 w-full gap-4 px-2 box-border">
                        <button
                          type="button"
                          className="gwl-quiz-button gwl-quiz-prev-btn flex items-center justify-center gap-2 font-semibold transition-all flex-1 duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                          style={{
                            backgroundColor: getActiveValue("quizPrimaryColor"),
                            borderRadius: getActiveValue("quizBorderRadius"),
                            border: "none",
                            color: getActiveValue("buttonTextColor") || "#ffffff",
                            height: "var(--quiz-nav-btn-height)",
                            minWidth: "var(--quiz-nav-btn-min-width)",
                            padding: "var(--quiz-nav-btn-padding)",
                            fontSize: "var(--quiz-nav-btn-font-size)",
                            boxSizing: "border-box",
                            boxShadow: `0 4px 12px ${getActiveValue("quizPrimaryColor")}28`,
                            cursor: "pointer"
                          }}
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          className="gwl-quiz-button gwl-quiz-next-btn flex items-center justify-center gap-2 font-semibold text-white transition-all flex-1 duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                          style={{
                            backgroundColor: getActiveValue("quizPrimaryColor"),
                            color: getActiveValue("buttonTextColor") || "#ffffff",
                            borderRadius: getActiveValue("quizBorderRadius"),
                            border: "none",
                            height: "var(--quiz-nav-btn-height)",
                            minWidth: "var(--quiz-nav-btn-min-width)",
                            padding: "var(--quiz-nav-btn-padding)",
                            fontSize: "var(--quiz-nav-btn-font-size)",
                            boxSizing: "border-box",
                            boxShadow: `0 4px 12px ${getActiveValue("quizPrimaryColor")}28`
                          }}
                        >
                          Next Question
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Completion */}
                  {previewTab === "thanks" && (() => {
                    const thankYouAlign = getActiveValue("thankYouContentAlignment") || getActiveValue("quizContentAlignment") || "left";
                    return (
                      <div
                        className="gwl-quiz-results w-full max-w-md flex flex-col gap-4 py-2"
                        style={{ textAlign: thankYouAlign as any }}
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-white mb-4 shadow-md ${thankYouAlign === "center" ? "mx-auto" :
                              thankYouAlign === "right" ? "ml-auto" :
                                "mr-auto"
                            }`}
                          style={{ backgroundColor: getActiveValue("quizPrimaryColor"), boxShadow: `0 4px 14px ${getActiveValue("quizPrimaryColor")}40` }}
                        >
                          <Check className="w-7 h-7 stroke-[3]" />
                        </div>
                        <h2 className="gwl-quiz-heading text-3xl font-extrabold tracking-tight select-none" style={{ color: themeColors.thankYouText, fontFamily: getActiveValue("quizFontFamily") || 'inherit', lineHeight: 1.2 }}>
                          {getActiveValue("thankYouHeading")}
                        </h2>
                        <p
                          className={`gwl-quiz-subheading text-[15px] opacity-70 leading-relaxed select-none ${thankYouAlign === "center" ? "mx-auto" : thankYouAlign === "right" ? "ml-auto" : ""
                            }`}
                          style={{ color: themeColors.thankYouText, fontFamily: getActiveValue("quizFontFamily") || 'inherit' }}
                        >
                          {getActiveValue("thankYouBody")}
                        </p>

                        {/* Mocked Recommended Products slider matching storefront */}
                        <div
                          className="gwl-quiz-recommendations select-none"
                          style={{
                            display: "block",
                            backgroundColor: themeColors.thankYouBg,
                            color: themeColors.thankYouText,
                            borderTop: "1px solid color-mix(in srgb, var(--thank-you-text-color) 12%, transparent)",
                            marginTop: 0,
                            padding: "32px 40px 40px",
                            borderRadius: "0 0 var(--quiz-border-radius, 12px) var(--quiz-border-radius, 12px)",
                            textAlign: "center"
                          }}
                        >
                          <h3
                            className="gwl-quiz-heading gwl-quiz-recommendations-heading"
                            style={{
                              margin: "0 0 10px",
                              fontSize: "1.05rem",
                              fontWeight: 700,
                              color: themeColors.thankYouText
                            }}
                          >
                            {getActiveValue("recommendationHeading") || "Recommended for you"}
                          </h3>
                          <div
                            className="relative w-full px-6 box-border"
                          >
                            {/* Mockup carousel navigation arrows */}
                            <button
                              type="button"
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center cursor-pointer shadow-md transition-all duration-200"
                              style={{ color: themeColors.thankYouText }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <button
                              type="button"
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center cursor-pointer shadow-md transition-all duration-200"
                              style={{ color: themeColors.thankYouText }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                            </button>

                            <div className="flex gap-2.5 overflow-hidden py-1 justify-center">
                              <div className="flex-[0_0_145px] w-[145px]">
                                <div
                                  className="gwl-quiz-product-card"
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "#ffffff",
                                    borderRadius: getActiveValue("quizBorderRadius"),
                                    border: "var(--quiz-card-border)",
                                    boxShadow: "var(--quiz-card-shadow)",
                                    height: "100%",
                                    overflow: "hidden"
                                  }}
                                >
                                  <div style={{ width: "100%", height: "105px", overflow: "hidden", background: "#f5f5f5", borderRadius: "calc(var(--quiz-border-radius) - 6px)" }}>
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">Product Image</div>
                                  </div>
                                  <div style={{ padding: "6px 8px 4px", display: "flex", flexDirection: "column", gap: "2px", flex: 1, textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.3, color: themeColors.thankYouText, height: "30px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: "2px" }}>
                                      Premium Hydrating Cleanser
                                    </div>
                                    <div style={{ fontSize: "10px", fontWeight: 600, marginTop: "auto", paddingTop: "2px", color: getActiveValue("quizPrimaryColor") }}>
                                      USD 24.99
                                    </div>
                                  </div>
                                  <div style={{ padding: "0 8px 8px" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: getActiveValue("quizPrimaryColor"),
                                        color: getActiveValue("buttonTextColor") || "#ffffff",
                                        borderRadius: getActiveValue("quizBorderRadius"),
                                        height: "28px",
                                        fontSize: "11px",
                                        fontWeight: 600
                                      }}
                                    >
                                      View Product
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-[0_0_145px] w-[145px]">
                                <div
                                  className="gwl-quiz-product-card"
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "#ffffff",
                                    borderRadius: getActiveValue("quizBorderRadius"),
                                    border: "var(--quiz-card-border)",
                                    boxShadow: "var(--quiz-card-shadow)",
                                    height: "100%",
                                    overflow: "hidden"
                                  }}
                                >
                                  <div style={{ width: "100%", height: "105px", overflow: "hidden", background: "#f5f5f5", borderRadius: "calc(var(--quiz-border-radius) - 6px)" }}>
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">Product Image</div>
                                  </div>
                                  <div style={{ padding: "6px 8px 4px", display: "flex", flexDirection: "column", gap: "2px", flex: 1, textAlign: "left" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.3, color: themeColors.thankYouText, height: "30px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: "2px" }}>
                                      Daily SPF 50 Moisturizer
                                    </div>
                                    <div style={{ fontSize: "10px", fontWeight: 600, marginTop: "auto", paddingTop: "2px", color: getActiveValue("quizPrimaryColor") }}>
                                      USD 29.99
                                    </div>
                                  </div>
                                  <div style={{ padding: "0 8px 8px" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: getActiveValue("quizPrimaryColor"),
                                        color: getActiveValue("buttonTextColor") || "#ffffff",
                                        borderRadius: getActiveValue("quizBorderRadius"),
                                        height: "28px",
                                        fontSize: "11px",
                                        fontWeight: 600
                                      }}
                                    >
                                      View Product
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Sticky save bar — visible when header actions scroll out of view */}
      {showStickySave && isDirty && (
        <div className="fixed bottom-0 inset-x-0 z-[90] border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
          <div className="max-w-[1700px] mx-auto px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-xs font-bold text-slate-600 truncate">
                Unsaved theme overrides for <span className="text-slate-800">"{quiz.title}"</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 sm:ml-auto">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all disabled:opacity-50"
              >
                Discard
              </button>
              {renderSaveButton()}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Reset Customizations?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                This will delete all stylesheet overrides and theme settings specifically configured for this quiz, falling back to global settings.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-150">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Reset Overrides
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Editor Modal Overlay */}
      {expandedField && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800">{expandedField.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Edit rules directly in editor below</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedField(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-6 bg-slate-50 border-t border-slate-100">
              <textarea
                autoFocus
                placeholder={expandedField.placeholder}
                value={getActiveValue(expandedField.key) || ""}
                onChange={(e) => handleFieldChange(expandedField.key, e.target.value)}
                className="w-full h-full p-4 font-mono text-xs bg-white text-slate-800 border border-slate-200 outline-none resize-none rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setExpandedField(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}
