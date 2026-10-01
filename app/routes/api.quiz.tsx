import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getShopPlan } from "../billing.server";
import { checkFeatureAccess } from "../feature";
import { resolveQuizSettings } from "../utils/quizTranslations";
import { jsonApiError } from "../utils/userFacingErrors";

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
  thankYouBackgroundColor: "#ffffff",
  thankYouTextColor: "#111111",
  submitButtonBgColor: "#000000",
  customCss: "",
  customJs: "",
  registrationFormPosition: "before_quiz",
  autoAdvanceOnRadio: true,
  navigationButtonSize: "small",
  optionsPerRow: "1",
  optionInputStyle: "styled",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // App Proxy requests come with signature validation
  // authenticate.public.appProxy will verify it
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    console.error("[App Proxy] No offline session for shop — reinstall the app on this store.");
    return Response.json(
      {
        error:
          "QuizInsights is not fully installed on this store. Open the app in Shopify admin once, then reload this page.",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const quizId = url.searchParams.get("quizId")?.trim() ?? "";

  if (!quizId || quizId === "general") {
    return Response.json(
      {
        error:
          "Invalid Quiz ID. Add your 8-character Quiz ID in the Theme Editor Quiz block settings.",
      },
      { status: 400 },
    );
  }

  try {
    const category = await db.category.findUnique({
      where: {
        quizPublicId: quizId,
      },
    });

    if (!category || category.shopId !== session.shop) {
      return Response.json(
        { error: "Quiz not found for the supplied Quiz ID" },
        { status: 404 },
      );
    }

    const categoryId = category.id;

    const [questions, settings] = await Promise.all([
      db.question.findMany({
        where: {
          shopId: session.shop,
          categoryId,
        },
        select: {
          id: true,
          text: true,
          type: true,
          optionType: true,
          options: true,
        },
        orderBy: {
          position: "asc",
        },
      }),
      db.quizSettings.findUnique({
        where: {
          shopId: session.shop,
        },
      }),
    ]);

    // Merge fetched settings with defaults to handle any nulls in existing records
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

    const currentPlan = await getShopPlan(session.shop);

    if (!checkFeatureAccess(currentPlan, "customCss")) {
      finalSettings.customCss = "";
    }
    if (!checkFeatureAccess(currentPlan, "customJs")) {
      finalSettings.customJs = "";
    }

    return Response.json({
      questions,
      settings: resolveQuizSettings(finalSettings),
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("Error fetching public quiz:", error);
    return jsonApiError(error, "We couldn't load this quiz. Please try again later.");
  }
};
