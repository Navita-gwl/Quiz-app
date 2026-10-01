import {
  useLoaderData,
  useNavigation,
  useFetcher,
  Link,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { syncSubscription } from "../billing.server";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { checkFeatureAccess } from "../feature";
import { getAppUrl } from "../utils/appUrl.server";
import { useConfirmDialog } from "../components/ConfirmDialog";
import {
  Sparkles,
  Settings,
  Eye,
  Palette,
  Code,
  FileCode,
  RefreshCw,
  Copy,
  Maximize2,
  Lock,
  ExternalLink,
  Save,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import { resolveFetcherError } from "../utils/userFacingErrors";

const DEFAULT_SETTINGS = {
  optionDisplayStyle: "default",
  layoutDirection: "vertical",
  imageSize: "medium",
  borderRadius: "10px",
  primaryColor: "#111827",
  showQuestionNumbers: true,
  showProgressBar: true,
  autoScrollToNext: false,
  submitButtonText: "Submit Answers",
  formHeading: "Take our Quiz!",
  formSubheading: "Please enter your details to start",
  showNameField: true,
  showEmailField: true,
  startButtonText: "Start Quiz",
  formLayoutStyle: "centered",
  formBackgroundStyle: "white",
  inputFieldStyle: "rounded",
  formBackgroundColor: "#ffffff",
  formTextColor: "#111111",
  inputBorderColor: "#dcdcdc",
  inputFocusColor: "#111827",
  startButtonBgColor: "#000000",
  startButtonTextColor: "#ffffff",
  formWidth: "full",
  buttonStyle: "solid",
  quizDisplayMode: "step",
  progressStyle: "line",
  contentAlignment: "left",
  maxSelections: 0,
  formPrimaryColor: "#111827",
  formBorderRadius: "10px",
  formButtonStyle: "solid",
  formContentAlignment: "left",
  formOuterBorderRadius: "10px",
  quizBackgroundColor: "#ffffff",
  quizTextColor: "#111111",
  quizPrimaryColor: "#111827",
  quizBorderRadius: "10px",
  quizContentAlignment: "left",
  quizWidth: "full",
  quizOuterBorderRadius: "10px",
  thankYouHeading: "Thank you for your answers!",
  thankYouBody: "We will get back to you",
  thankYouColor: "#008060",
  submitButtonBgColor: "#000000",
  registrationFormPosition: "before_quiz",
  hydrogenQuizId: null,
  optionsPerRow: "1",
};

function getComparableSettings(state: Record<string, unknown> | null | undefined) {
  if (!state) return {};
  const { customCss: _customCss, customJs: _customJs, ...settings } = state;
  return settings;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  try {
    const embedUrl = `${getAppUrl(request)}/embed/quiz?shop=${session.shop}`;

    let settings = await db.quizSettings.upsert({
      where: { shopId: session.shop },
      update: { embedUrl },
      create: {
        shopId: session.shop,
        embedUrl,
        ...DEFAULT_SETTINGS,
      },
    });

    const merged = { ...DEFAULT_SETTINGS, embedUrl: settings.embedUrl };
    const radiusFields = ['borderRadius', 'formBorderRadius', 'formOuterBorderRadius', 'quizBorderRadius', 'quizOuterBorderRadius'];
    const radiusMap: any = { small: "4px", medium: "10px", large: "16px" };

    for (const key in DEFAULT_SETTINGS) {
      let val = (settings as any)[key];
      if (val !== null && val !== undefined) {
        if (radiusFields.includes(key) && radiusMap[val as string]) {
          val = radiusMap[val as string] as any;
        }
        (merged as any)[key] = val;
      }
    }
    settings = merged as any;

    const currentPlan = await syncSubscription(admin, session.shop);

    const quizzes = await db.category.findMany({
      where: { shopId: session.shop },
      select: {
        title: true,
        quizPublicId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Hydrogen Quiz ID loaded:", settings.hydrogenQuizId);
    return { settings, currentPlan, quizzes };
  } catch (error) {
    console.error("Error loading settings:", error);
    return { settings: DEFAULT_SETTINGS, error: "Failed to load settings", currentPlan: "FREE", quizzes: [] };
  }
};

export default function SettingsPage() {
  const { settings: initialSettings, currentPlan, quizzes } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const fetcher = useFetcher<any>();
  const { confirm } = useConfirmDialog();

  const [formState, setFormState] = useState<any>(initialSettings || DEFAULT_SETTINGS);
  const [initialFormState, setInitialFormState] = useState<any>(initialSettings || DEFAULT_SETTINGS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedField, setExpandedField] = useState<{
    key: "iframeHtml";
    title: string;
    placeholder: string;
    readOnly?: boolean;
  } | null>(null);

  const hasHydrogenAccess = checkFeatureAccess(currentPlan, "hydrogen");

  useEffect(() => {
    if (initialSettings) {
      setFormState(initialSettings);
      setInitialFormState(initialSettings);
    }
  }, [initialSettings]);

  const isDirty =
    JSON.stringify(getComparableSettings(formState)) !==
    JSON.stringify(getComparableSettings(initialFormState));

  useEffect(() => {
    if (fetcher.data?.success) {
      setSaveError(null);
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    const message = resolveFetcherError(fetcher.data, "We couldn't save your settings. Please try again.");
    if (message) {
      setSaveError(message);
    }
  }, [fetcher.data]);

  const isSaving = fetcher.state !== "idle";
  const isSubmitting = navigation.state === "submitting" || isSaving;

  const handleSubmit = () => {
    const { customCss: _customCss, customJs: _customJs, ...settingsToSave } = formState;
    fetcher.submit(settingsToSave, {
      method: "post",
      action: "/api/settings",
      encType: "application/json"
    });
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset to Defaults?",
      message:
        "Are you sure you want to reset all settings to default? This cannot be undone.",
      confirmLabel: "Reset Settings",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    fetcher.submit({ intent: "reset" }, {
      method: "post",
      action: "/api/settings",
      encType: "application/json"
    });
  };

  useEffect(() => {
    if (fetcher.data?.settings) {
      setFormState(fetcher.data.settings);
      setInitialFormState(fetcher.data.settings);
    }
  }, [fetcher.data]);

  return (
    <s-page heading="Quiz Settings" inlineSize="large">
      <div className="min-h-screen bg-slate-50/50 pb-20 font-sans px-6 max-w-[1700px] mx-auto pt-6">

        {/* Top Header Card */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-brand-600" /> Customize Theme & Form
            </h1>
            <p className="text-sm text-slate-500 mt-1">Configure layout, colors, fields, and embed widgets.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-100 hover:bg-rose-100/80 hover:border-rose-200 text-rose-600 shadow-sm transition-all"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isDirty || isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-1.5" /> {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Theme settings updated successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}



        <div className="flex flex-col gap-10">

          {/* Form Settings Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCode className="w-5 h-5 text-indigo-650" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lead Form Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Fields & Options */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <h3 className="font-bold text-slate-800 text-[14px]">Content & Position</h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-650">Form Title</label>
                  <input
                    type="text"
                    value={formState.formHeading}
                    onChange={(e) => setFormState({ ...formState, formHeading: e.target.value })}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-650">Form Description</label>
                  <input
                    type="text"
                    value={formState.formSubheading}
                    onChange={(e) => setFormState({ ...formState, formSubheading: e.target.value })}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Start Button Label</label>
                    <input
                      type="text"
                      value={formState.startButtonText}
                      onChange={(e) => setFormState({ ...formState, startButtonText: e.target.value })}
                      className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Registration Placement</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={formState.registrationFormPosition || "before_quiz"}
                      onChange={(e) => setFormState({ ...formState, registrationFormPosition: e.target.value })}
                    >
                      <option value="before_quiz">Before Quiz Questions</option>
                      <option value="after_quiz">After Quiz Questions</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-2 border-t border-slate-50">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Content Alignment</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={formState.formContentAlignment}
                      onChange={(e) => setFormState({ ...formState, formContentAlignment: e.target.value })}
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Form Styling */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <h3 className="font-bold text-slate-800 text-[14px]">Form Theme</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.formBackgroundColor}
                        onChange={(e) => setFormState({ ...formState, formBackgroundColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.formBackgroundColor}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.formTextColor}
                        onChange={(e) => setFormState({ ...formState, formTextColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.formTextColor}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Start Button Background</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.startButtonBgColor}
                        onChange={(e) => setFormState({ ...formState, startButtonBgColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.startButtonBgColor}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Accent Highlight</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.formPrimaryColor}
                        onChange={(e) => setFormState({ ...formState, formPrimaryColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.formPrimaryColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                    <span>Input Fields Rounded Radius</span>
                    <span className="font-mono text-brand-600">{formState.formBorderRadius}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={parseInt(formState.formBorderRadius) || 0}
                      onChange={(e) => setFormState({ ...formState, formBorderRadius: e.target.value + "px" })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                    <span>Outer Box Rounded Radius</span>
                    <span className="font-mono text-brand-600">{formState.formOuterBorderRadius}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={parseInt(formState.formOuterBorderRadius) || 0}
                      onChange={(e) => setFormState({ ...formState, formOuterBorderRadius: e.target.value + "px" })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Quiz Question Settings Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="w-5 h-5 text-indigo-650" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Quiz & Recommendation Flow Style</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Layout & Themes */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <h3 className="font-bold text-slate-800 text-[14px]">Quiz Theme</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.quizBackgroundColor}
                        onChange={(e) => setFormState({ ...formState, quizBackgroundColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.quizBackgroundColor}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Text Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.quizTextColor}
                        onChange={(e) => setFormState({ ...formState, quizTextColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.quizTextColor}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Primary Highlight Accent</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.quizPrimaryColor}
                        onChange={(e) => setFormState({ ...formState, quizPrimaryColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.quizPrimaryColor}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Submit Button Background</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                      <input
                        type="color"
                        className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                        value={formState.submitButtonBgColor}
                        onChange={(e) => setFormState({ ...formState, submitButtonBgColor: e.target.value })}
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.submitButtonBgColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                    <span>Options Rounded Radius</span>
                    <span className="font-mono text-brand-600">{formState.quizBorderRadius}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={parseInt(formState.quizBorderRadius) || 0}
                      onChange={(e) => setFormState({ ...formState, quizBorderRadius: e.target.value + "px" })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                    <span>Quiz Container Rounded Radius</span>
                    <span className="font-mono text-brand-600">{formState.quizOuterBorderRadius}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 rounded-xl px-3 h-11">
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={parseInt(formState.quizOuterBorderRadius) || 0}
                      onChange={(e) => setFormState({ ...formState, quizOuterBorderRadius: e.target.value + "px" })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">px</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Option List Layout</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={formState.optionDisplayStyle}
                      onChange={(e) => setFormState({ ...formState, optionDisplayStyle: e.target.value })}
                    >
                      <option value="default">Default Stacked</option>
                      <option value="card">Border Cards</option>
                      <option value="button">Pill Buttons</option>
                      <option value="image-grid">Visual Image Grid</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-650">Choice Image Size</label>
                    <select
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                      value={formState.imageSize}
                      onChange={(e) => setFormState({ ...formState, imageSize: e.target.value })}
                    >
                      <option value="extra-small">Extra Small</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-650">Text Alignment</label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                    value={formState.quizContentAlignment}
                    onChange={(e) => setFormState({ ...formState, quizContentAlignment: e.target.value })}
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>

              </div>

              {/* Flow Settings */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-5">
                  <h3 className="font-bold text-slate-800 text-[14px]">Quiz Experience</h3>

                  {/* Toggle list */}
                  <div className="flex flex-col gap-3.5 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                        checked={formState.showQuestionNumbers}
                        onChange={(e) => setFormState({ ...formState, showQuestionNumbers: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-slate-700">Display Question Step Numbers</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                        checked={formState.showProgressBar}
                        onChange={(e) => setFormState({ ...formState, showProgressBar: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-slate-700">Display Progress Progress-bar</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4.5 h-4.5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                        checked={formState.autoScrollToNext}
                        onChange={(e) => setFormState({ ...formState, autoScrollToNext: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-slate-700">Auto-navigate on Selection</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-650">Step Layout Mode</label>
                      <select
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white outline-none focus:border-brand-500 transition-all"
                        value={formState.quizDisplayMode}
                        onChange={(e) => setFormState({ ...formState, quizDisplayMode: e.target.value })}
                      >
                        <option value="step">One question per screen</option>
                        <option value="2">Two questions per screen</option>
                        <option value="3">Three questions per screen</option>
                        <option value="all">All questions single screen</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-650">Submit Button Text</label>
                      <input
                        type="text"
                        value={formState.submitButtonText}
                        onChange={(e) => setFormState({ ...formState, submitButtonText: e.target.value })}
                        className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Completion Screen Settings</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-650">Thank You Header</label>
                        <input
                          type="text"
                          value={formState.thankYouHeading}
                          onChange={(e) => setFormState({ ...formState, thankYouHeading: e.target.value })}
                          className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-650">Thank You Subtext</label>
                        <input
                          type="text"
                          value={formState.thankYouBody}
                          onChange={(e) => setFormState({ ...formState, thankYouBody: e.target.value })}
                          className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-650">Completion Highlight Color</label>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-white">
                        <input
                          type="color"
                          className="w-6 h-6 border-0 cursor-pointer rounded-md bg-transparent"
                          value={formState.thankYouColor}
                          onChange={(e) => setFormState({ ...formState, thankYouColor: e.target.value })}
                        />
                        <span className="text-xs font-bold text-slate-600 font-mono uppercase">{formState.thankYouColor}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Developer Embeds */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Code className="w-5 h-5 text-indigo-650" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Developer Embeds</h2>
            </div>

            {/* Hydrogen Embed */}
            <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <ExternalLink className="w-4.5 h-4.5 text-indigo-650" /> Hydrogen / Headless Storefront Embed
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
                    Insert the quiz widget inside custom React, Next.js, or Hydrogen headless storefronts using the embed URL or iframe code snippet below.
                  </p>
                  <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 max-w-2xl leading-relaxed">
                    <span className="text-[14px]">💡</span>
                    <div>
                      <strong>How to find your Quiz ID:</strong> Go to the <Link to="/app/questions" className="underline font-bold hover:text-blue-900">Quizzes</Link> section, find the quiz you want to embed, and click the copy icon next to the Quiz ID in the table. Then, replace <code>QUIZ_ID</code> in the code snippets below with that copied ID.
                    </div>
                  </div>
                </div>
                {!hasHydrogenAccess && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Premium
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-5">
                {(() => {
                  const baseEmbedUrl = formState.embedUrl || "";
                  const embedUrlWithPlaceholder = baseEmbedUrl ? `${baseEmbedUrl}&quiz=QUIZ_ID` : "";

                  return (
                    <>
                      {/* Embed URL */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Embed URL</span>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            disabled={!hasHydrogenAccess}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono outline-none bg-slate-50 text-slate-600 truncate"
                            value={hasHydrogenAccess ? embedUrlWithPlaceholder : "Upgrade to Starter plan to unlock embed URL"}
                          />
                          <button
                            type="button"
                            disabled={!hasHydrogenAccess}
                            onClick={() => {
                              if (hasHydrogenAccess && embedUrlWithPlaceholder) {
                                navigator.clipboard.writeText(embedUrlWithPlaceholder);
                                setCopiedUrl(true);
                                setTimeout(() => setCopiedUrl(false), 1500);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 bg-white text-xs font-medium"
                            title="Copy URL"
                          >
                            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedUrl ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Iframe Snippet */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Iframe Code Snippet</span>
                          {hasHydrogenAccess && (
                            <button
                              type="button"
                              onClick={() => setExpandedField({
                                key: "iframeHtml",
                                title: "Hydrogen Embed Iframe HTML",
                                placeholder: "",
                                readOnly: true
                              })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Maximize2 className="w-3 h-3" /> Fullscreen
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            disabled={!hasHydrogenAccess}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono outline-none bg-slate-50 text-slate-600 truncate"
                            value={hasHydrogenAccess ? `<iframe src="${embedUrlWithPlaceholder}" width="100%" height="600" style="border:none;"></iframe>` : "Upgrade to unlock iframe snippet"}
                          />
                          <button
                            type="button"
                            disabled={!hasHydrogenAccess}
                            onClick={() => {
                              if (hasHydrogenAccess) {
                                const code = `<iframe src="${embedUrlWithPlaceholder}" width="100%" height="600" style="border:none;"></iframe>`;
                                navigator.clipboard.writeText(code);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 1500);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 bg-white text-xs font-medium"
                            title="Copy Code"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedCode ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Expanded Editor Modal Overlay */}
      {expandedField && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800">{expandedField.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {expandedField.readOnly ? "View read-only layout" : "Edit rules directly in editor below"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedField(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Editor Body — light theme */}
            <div className="flex-1 p-6 bg-slate-50 overflow-hidden">
              <textarea
                autoFocus
                readOnly={expandedField.readOnly}
                placeholder={expandedField.placeholder}
                value={`<iframe src="${(formState.embedUrl || "") ? `${formState.embedUrl}&quiz=QUIZ_ID` : ""}" width="100%" height="600" style="border:none;"></iframe>`}
                onChange={undefined}
                className="w-full h-full p-4 font-mono text-sm bg-white text-slate-800 border border-slate-200 outline-none resize-none rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
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
