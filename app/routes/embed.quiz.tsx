import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

export const headers: HeadersFunction = () => ({
  "Content-Security-Policy": "frame-ancestors *;",
  "X-Frame-Options": "ALLOWALL",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
});
import db from "../db.server";
import { getShopPlan } from "../billing.server";
import { checkFeatureAccess } from "../feature";
import { resolveQuizSettings } from "../utils/quizTranslations";
import { getAppUrl } from "../utils/appUrl.server";

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
  buttonTextColor: "#ffffff",
  quizBorderRadius: "10px",
  quizContentAlignment: "left",
  quizWidth: "full",
  quizOuterBorderRadius: "10px",
  thankYouHeading: "Thank you for your answers!",
  thankYouBody: "We will get back to you",
  thankYouColor: "#008060",
  thankYouBackgroundColor: "#ffffff",
  thankYouTextColor: "#111111",
  submitButtonBgColor: "#000000",
  customCss: "",
  customJs: "",
  registrationFormPosition: "before_quiz",
  autoAdvanceOnRadio: true,
  navigationButtonSize: "small",
  hydrogenQuizId: null,
  optionsPerRow: "1",
  optionInputStyle: "styled",
  imageShape: "square",
  imageCardSize: "large",
  imageLabelLayout: "inline-right",
  imageWidth: "medium",
  imageHeight: "medium",
  imageOptionsPerRow: "",
  selectionBackground: "enable",
  imageSelectionBgColor: "#f4f4f5",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop");
  const quizId = url.searchParams.get("quiz")?.trim() || url.searchParams.get("quizId")?.trim();

  if (!shop && process.env.NODE_ENV === "development") {
    // Fallback shop for development if provided via env
    shop = process.env.SHOP || null;
  }

  if (!shop) {
    return {
      quizData: null,
      shop: "",
      appUrl: getAppUrl(request),
      storefrontOrigin: url.searchParams.get("origin") || "",
      quizId: quizId || "",
      error: "This quiz embed link is missing the shop parameter.",
    };
  }

  const currentPlan = await getShopPlan(shop);

  const appUrl = getAppUrl(request);

  if (!checkFeatureAccess(currentPlan, "hydrogen")) {
    return {
      quizData: null,
      shop,
      appUrl,
      storefrontOrigin: url.searchParams.get("origin") || "",
      quizId: quizId || "",
      error: "Hydrogen / Headless integration is not enabled on the Free plan. Please upgrade to Starter.",
    };
  }

  if (!quizId || quizId === "") {
    return {
      quizData: null,
      shop,
      appUrl,
      storefrontOrigin: url.searchParams.get("origin") || "",
      quizId: "",
      error: "No quiz parameter was provided. Please specify a valid quiz parameter (quiz or quizId) in the URL.",
    };
  }

  try {
    const settings = await db.quizSettings.findUnique({
      where: { shopId: shop },
    });

    console.log("Requested quizId from URL:", quizId);

    const category = await db.category.findUnique({
      where: {
        quizPublicId: quizId,
      },
    });

    if (!category || category.shopId !== shop) {
      return {
        quizData: null,
        shop,
        appUrl,
        storefrontOrigin: url.searchParams.get("origin") || "",
        quizId,
        error: "Quiz not found for the supplied Quiz ID",
      };
    }

    const categoryId = category.id;
    const resolvedPublicId = category.quizPublicId;

    console.log("Final quiz selected:", resolvedPublicId);

    const questions = await db.question.findMany({
      where: { shopId: shop, categoryId },
      orderBy: { position: "asc" },
    });

    // Merge fetched settings with defaults
    const finalSettings = { ...DEFAULT_SETTINGS };
    const radiusFields = ['borderRadius', 'formBorderRadius', 'formOuterBorderRadius', 'quizBorderRadius', 'quizOuterBorderRadius'];
    const radiusMap: any = { small: "4px", medium: "10px", large: "16px" };

    if (settings) {
      for (const key in DEFAULT_SETTINGS) {
        let val = (settings as any)[key];
        if (val !== null && val !== undefined) {
          if (radiusFields.includes(key) && radiusMap[val as string]) {
            val = radiusMap[val as string];
          }
          (finalSettings as any)[key] = val;
        }
      }
    }

    // Custom CSS/JS are quiz-level only; ignore any legacy global values
    finalSettings.customCss = "";
    finalSettings.customJs = "";

    // Merge category-specific settings overrides
    if (category && category.settings) {
      const overrides = category.settings as any;
      for (const key in overrides) {
        let val = overrides[key];
        if (val !== null && val !== undefined) {
          if (radiusFields.includes(key) && radiusMap[val as string]) {
            val = radiusMap[val as string];
          }
          (finalSettings as any)[key] = val;
        }
      }
    }

    if (!checkFeatureAccess(currentPlan, "customCss")) {
      finalSettings.customCss = "";
    }
    if (!checkFeatureAccess(currentPlan, "customJs")) {
      finalSettings.customJs = "";
    }

    const storefrontOrigin = url.searchParams.get("origin") || "";

    return {
      quizData: {
        questions,
        settings: resolveQuizSettings(finalSettings),
      },
      shop,
      appUrl,
      storefrontOrigin,
      quizId: resolvedPublicId,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching embed quiz:", error);
    return {
      quizData: null,
      shop: shop || "",
      appUrl: getAppUrl(request),
      storefrontOrigin: url.searchParams.get("origin") || "",
      quizId: quizId || "",
      error: "We couldn't load this quiz. Please try again later.",
    };
  }
};

function useEmbedShell() {
  useEffect(() => {
    document.documentElement.classList.add("gwl-quiz-embed");
    return () => {
      document.documentElement.classList.remove("gwl-quiz-embed");
    };
  }, []);
}

export default function EmbedQuiz() {
  const { quizData, shop, appUrl, storefrontOrigin, quizId, error } = useLoaderData<typeof loader>();

  useEmbedShell();

  useEffect(() => {
    if (error || !appUrl) return;

    const timestamp = new Date().getTime();
    const script = document.createElement("script");
    script.src = `${appUrl}/quiz.js?v=${timestamp}`;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [appUrl, error]);

  const stylesheet = appUrl ? (
    <link rel="stylesheet" href={`${appUrl}/quiz.css?v=${Date.now()}`} />
  ) : null;

  if (error) {
    const isMissingParam = error.includes("No quiz parameter");
    return (
      <>
        {stylesheet}
        <div className="gwl-quiz-embed-error-card">
          <h3 className="gwl-quiz-embed-error-title">{isMissingParam ? "No Quiz Found" : "Quiz Not Found"}</h3>
          <p className="gwl-quiz-embed-error-text">{error}</p>
          {isMissingParam && (
            <div className="gwl-quiz-embed-error-divider">
              <span className="gwl-quiz-embed-error-label">Please specify a valid quiz in the URL.</span>
              <span className="gwl-quiz-embed-error-label">Example:</span>
              <code className="gwl-quiz-embed-error-code">
                {appUrl}/embed/quiz?shop={shop}&quiz=YOUR_QUIZ_ID
              </code>
            </div>
          )}
        </div>
      </>
    );
  }

  const leadNameInputId = `gwl-quiz-lead-name-${quizId || "general"}`;
  const leadEmailInputId = `gwl-quiz-lead-email-${quizId || "general"}`;

  return (
    <>
      {stylesheet}

      <div
        id={`gwl-quiz-${quizId || "general"}`}
        className="gwl-quiz-container"
        data-gwl-quiz-embed="true"
        data-shop-domain={shop}
        data-quiz-id={quizId || "general"}
        data-app-proxy-url={appUrl}
        data-storefront-origin={storefrontOrigin}
      >
        <div className="gwl-quiz-loading">Loading quiz...</div>
        <div className="gwl-quiz-error" style={{ display: "none", color: "red" }}></div>

        {/* Lead Form — same markup as theme extension quiz.liquid */}
        <div className="gwl-quiz-registration-form" style={{ display: "none" }}>
          <div className="gwl-quiz-header">
            <h2 className="gwl-quiz-heading">Take our Quiz!</h2>
            <h4 className="gwl-quiz-subheading">Please enter your details to start</h4>
          </div>
          <div className="gwl-quiz-form-group">
            <label htmlFor={leadNameInputId}>Name</label>
            <input type="text" id={leadNameInputId} className="gwl-quiz-input gwl-quiz-input-name" required placeholder="Your Name" />
          </div>
          <div className="gwl-quiz-form-group">
            <label htmlFor={leadEmailInputId}>Email</label>
            <input type="email" id={leadEmailInputId} className="gwl-quiz-input gwl-quiz-input-email" required placeholder="your@email.com" />
          </div>
          <button type="button" className="gwl-quiz-submit-btn gwl-quiz-start-btn">Start Quiz</button>
        </div>

        <form className="gwl-quiz-form" style={{ display: "none" }}>
          <div className="gwl-quiz-questions"></div>
          <button type="submit" className="gwl-quiz-submit-btn">Submit Answers</button>
        </form>

        <div className="gwl-quiz-results" style={{ display: "none" }}>
          <div className="gwl-quiz-results-header">
            <div className="gwl-quiz-results-text">
              <h3 className="gwl-quiz-heading"></h3>
              <p className="gwl-quiz-subheading"></p>
            </div>
          </div>
        </div>

        <div className="gwl-quiz-recommendations" style={{ display: "none" }}></div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        window.quizAppConfig = {
          customerId: null,
          shopDomain: ${JSON.stringify(shop)},
          appProxyUrl: ${JSON.stringify(appUrl)},
          submitUrl: ${JSON.stringify(`${appUrl}/api/public/submit?quizId=${encodeURIComponent(quizId || "")}`)},
          storefrontOrigin: ${JSON.stringify(storefrontOrigin)},
          quizId: ${JSON.stringify(quizId)},
          isIframe: true
        };
        window.quizInitialData = ${JSON.stringify(quizData)};
      `,
        }}
      />
    </>
  );
}
