import type { LoaderFunctionArgs } from "react-router";
import { cors } from "../utils/cors";
import db from "../db.server";
import { getShopPlan } from "../billing.server";
import { checkFeatureAccess } from "../feature";
import { guardPublicApi, resolvePublicQuizCategory } from "../utils/publicApi.server";
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
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  const quizParam =
    url.searchParams.get("quiz")?.trim() || url.searchParams.get("quizId")?.trim();

  const guard = await guardPublicApi(request, shopParam, "quiz");
  if (guard instanceof Response) return guard;
  const { shop } = guard;

  const resolved = await resolvePublicQuizCategory(request, shop, quizParam);
  if ("error" in resolved) return resolved.error;
  const { category, quizId } = resolved;

  console.log(`[Public API] Quiz fetch for shop: ${shop}, quizPublicId: ${quizId}`);

  try {
    const [settings, currentPlan] = await Promise.all([
      db.quizSettings.findUnique({
        where: {
          shopId: shop,
        },
      }),
      getShopPlan(shop),
    ]);

    const categoryId = category.id;

    const questions = await db.question.findMany({
      where: {
        shopId: shop,
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
    });

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

    if (!checkFeatureAccess(currentPlan, "customCss")) {
      finalSettings.customCss = "";
    }
    if (!checkFeatureAccess(currentPlan, "customJs")) {
      finalSettings.customJs = "";
    }

    return cors(request, Response.json({
      questions,
      settings: resolveQuizSettings(finalSettings),
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    }));
  } catch (error) {
    console.error("Error fetching public quiz:", error);
    return cors(request, jsonApiError(error, "We couldn't load this quiz. Please try again later."));
  }
};
