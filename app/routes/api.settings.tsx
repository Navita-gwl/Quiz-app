import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getAppUrl } from "../utils/appUrl.server";
import { GENERIC_LOAD_ERROR, GENERIC_SAVE_ERROR, toUserFacingError } from "../utils/userFacingErrors";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    const embedUrl = `${getAppUrl(request)}/embed/quiz?shop=${session.shop}`;

    // Use upsert to safely ensure settings and embedUrl exist
    let settings = await db.quizSettings.upsert({
      where: { shopId: session.shop },
      update: { embedUrl },
      create: {
        shopId: session.shop,
        embedUrl,
        ...DEFAULT_SETTINGS,
      },
    });

    if (settings) {
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
    }

    return ({ settings });
  } catch (error) {
    console.error("Error fetching quiz settings:", error);
    return { settings: DEFAULT_SETTINGS, error: GENERIC_LOAD_ERROR };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("[api.settings] ACTION TRIGGERED");
  const { session } = await authenticate.admin(request);
  console.log("[api.settings] Session found for shop:", session?.shop);

  try {
    const body = await request.json();
    console.log("[api.settings] Action received field keys:", Object.keys(body));

    // Handle Reset Action
    if (body.intent === "reset") {
      const settings = await db.quizSettings.update({
        where: {
          shopId: session.shop,
        },
        data: DEFAULT_SETTINGS,
      });
      return { success: true, settings };
    }

    // Update or create settings
    const settings = await db.quizSettings.upsert({
      where: {
        shopId: session.shop,
      },
      update: {
        optionDisplayStyle: body.optionDisplayStyle || DEFAULT_SETTINGS.optionDisplayStyle,
        layoutDirection: body.layoutDirection || DEFAULT_SETTINGS.layoutDirection,
        imageSize: body.imageSize || DEFAULT_SETTINGS.imageSize,
        borderRadius: body.borderRadius || DEFAULT_SETTINGS.borderRadius,
        primaryColor: body.primaryColor || DEFAULT_SETTINGS.primaryColor,
        showQuestionNumbers: body.showQuestionNumbers ?? DEFAULT_SETTINGS.showQuestionNumbers,
        showProgressBar: body.showProgressBar ?? DEFAULT_SETTINGS.showProgressBar,
        autoScrollToNext: body.autoScrollToNext ?? DEFAULT_SETTINGS.autoScrollToNext,
        submitButtonText: body.submitButtonText || DEFAULT_SETTINGS.submitButtonText,
        formHeading: body.formHeading || DEFAULT_SETTINGS.formHeading,
        formSubheading: body.formSubheading || DEFAULT_SETTINGS.formSubheading,
        showNameField: body.showNameField ?? DEFAULT_SETTINGS.showNameField,
        showEmailField: body.showEmailField ?? DEFAULT_SETTINGS.showEmailField,
        startButtonText: body.startButtonText || DEFAULT_SETTINGS.startButtonText,
        formLayoutStyle: body.formLayoutStyle || DEFAULT_SETTINGS.formLayoutStyle,
        formBackgroundStyle: body.formBackgroundStyle || DEFAULT_SETTINGS.formBackgroundStyle,
        inputFieldStyle: body.inputFieldStyle || DEFAULT_SETTINGS.inputFieldStyle,
        formBackgroundColor: body.formBackgroundColor || DEFAULT_SETTINGS.formBackgroundColor,
        formTextColor: body.formTextColor || DEFAULT_SETTINGS.formTextColor,
        inputBorderColor: body.inputBorderColor || DEFAULT_SETTINGS.inputBorderColor,
        inputFocusColor: body.inputFocusColor || DEFAULT_SETTINGS.inputFocusColor,
        startButtonBgColor: body.startButtonBgColor || DEFAULT_SETTINGS.startButtonBgColor,
        startButtonTextColor: body.startButtonTextColor || DEFAULT_SETTINGS.startButtonTextColor,
        formWidth: body.formWidth || DEFAULT_SETTINGS.formWidth,
        buttonStyle: body.buttonStyle || DEFAULT_SETTINGS.buttonStyle,
        quizDisplayMode: body.quizDisplayMode || DEFAULT_SETTINGS.quizDisplayMode,
        progressStyle: body.progressStyle || DEFAULT_SETTINGS.progressStyle,
        contentAlignment: body.contentAlignment || DEFAULT_SETTINGS.contentAlignment,
        maxSelections: Number(body.maxSelections) || DEFAULT_SETTINGS.maxSelections,
        formPrimaryColor: body.formPrimaryColor || DEFAULT_SETTINGS.formPrimaryColor,
        formBorderRadius: body.formBorderRadius || DEFAULT_SETTINGS.formBorderRadius,
        formButtonStyle: body.formButtonStyle || DEFAULT_SETTINGS.formButtonStyle,
        formContentAlignment: body.formContentAlignment || DEFAULT_SETTINGS.formContentAlignment,
        formOuterBorderRadius: body.formOuterBorderRadius || DEFAULT_SETTINGS.formOuterBorderRadius,
        quizBackgroundColor: body.quizBackgroundColor || DEFAULT_SETTINGS.quizBackgroundColor,
        quizTextColor: body.quizTextColor || DEFAULT_SETTINGS.quizTextColor,
        quizPrimaryColor: body.quizPrimaryColor || DEFAULT_SETTINGS.quizPrimaryColor,
        quizBorderRadius: body.quizBorderRadius || DEFAULT_SETTINGS.quizBorderRadius,
        quizContentAlignment: body.quizContentAlignment || DEFAULT_SETTINGS.quizContentAlignment,
        quizWidth: body.quizWidth || DEFAULT_SETTINGS.quizWidth,
        quizOuterBorderRadius: body.quizOuterBorderRadius || DEFAULT_SETTINGS.quizOuterBorderRadius,
        thankYouHeading: body.thankYouHeading || DEFAULT_SETTINGS.thankYouHeading,
        thankYouBody: body.thankYouBody || DEFAULT_SETTINGS.thankYouBody,
        thankYouColor: body.thankYouColor || DEFAULT_SETTINGS.thankYouColor,
        submitButtonBgColor: body.submitButtonBgColor || DEFAULT_SETTINGS.submitButtonBgColor,
        registrationFormPosition: body.registrationFormPosition || DEFAULT_SETTINGS.registrationFormPosition,
      } as any,

      create: {
        shopId: session.shop,
        optionDisplayStyle: body.optionDisplayStyle || DEFAULT_SETTINGS.optionDisplayStyle,
        layoutDirection: body.layoutDirection || DEFAULT_SETTINGS.layoutDirection,
        imageSize: body.imageSize || DEFAULT_SETTINGS.imageSize,
        borderRadius: body.borderRadius || DEFAULT_SETTINGS.borderRadius,
        primaryColor: body.primaryColor || DEFAULT_SETTINGS.primaryColor,
        showQuestionNumbers: body.showQuestionNumbers ?? DEFAULT_SETTINGS.showQuestionNumbers,
        showProgressBar: body.showProgressBar ?? DEFAULT_SETTINGS.showProgressBar,
        autoScrollToNext: body.autoScrollToNext ?? DEFAULT_SETTINGS.autoScrollToNext,
        submitButtonText: body.submitButtonText || DEFAULT_SETTINGS.submitButtonText,
        formHeading: body.formHeading || DEFAULT_SETTINGS.formHeading,
        formSubheading: body.formSubheading || DEFAULT_SETTINGS.formSubheading,
        showNameField: body.showNameField ?? DEFAULT_SETTINGS.showNameField,
        showEmailField: body.showEmailField ?? DEFAULT_SETTINGS.showEmailField,
        startButtonText: body.startButtonText || DEFAULT_SETTINGS.startButtonText,
        formLayoutStyle: body.formLayoutStyle || DEFAULT_SETTINGS.formLayoutStyle,
        formBackgroundStyle: body.formBackgroundStyle || DEFAULT_SETTINGS.formBackgroundStyle,
        inputFieldStyle: body.inputFieldStyle || DEFAULT_SETTINGS.inputFieldStyle,
        formBackgroundColor: body.formBackgroundColor || DEFAULT_SETTINGS.formBackgroundColor,
        formTextColor: body.formTextColor || DEFAULT_SETTINGS.formTextColor,
        inputBorderColor: body.inputBorderColor || DEFAULT_SETTINGS.inputBorderColor,
        inputFocusColor: body.inputFocusColor || DEFAULT_SETTINGS.inputFocusColor,
        startButtonBgColor: body.startButtonBgColor || DEFAULT_SETTINGS.startButtonBgColor,
        startButtonTextColor: body.startButtonTextColor || DEFAULT_SETTINGS.startButtonTextColor,
        formWidth: body.formWidth || DEFAULT_SETTINGS.formWidth,
        buttonStyle: body.buttonStyle || DEFAULT_SETTINGS.buttonStyle,
        quizDisplayMode: body.quizDisplayMode || DEFAULT_SETTINGS.quizDisplayMode,
        progressStyle: body.progressStyle || DEFAULT_SETTINGS.progressStyle,
        contentAlignment: body.contentAlignment || DEFAULT_SETTINGS.contentAlignment,
        maxSelections: Number(body.maxSelections) || DEFAULT_SETTINGS.maxSelections,
        formPrimaryColor: body.formPrimaryColor || DEFAULT_SETTINGS.formPrimaryColor,
        formBorderRadius: body.formBorderRadius || DEFAULT_SETTINGS.formBorderRadius,
        formButtonStyle: body.formButtonStyle || DEFAULT_SETTINGS.formButtonStyle,
        formContentAlignment: body.formContentAlignment || DEFAULT_SETTINGS.formContentAlignment,
        formOuterBorderRadius: body.formOuterBorderRadius || DEFAULT_SETTINGS.formOuterBorderRadius,
        quizBackgroundColor: body.quizBackgroundColor || DEFAULT_SETTINGS.quizBackgroundColor,
        quizTextColor: body.quizTextColor || DEFAULT_SETTINGS.quizTextColor,
        quizPrimaryColor: body.quizPrimaryColor || DEFAULT_SETTINGS.quizPrimaryColor,
        quizBorderRadius: body.quizBorderRadius || DEFAULT_SETTINGS.quizBorderRadius,
        quizContentAlignment: body.quizContentAlignment || DEFAULT_SETTINGS.quizContentAlignment,
        quizWidth: body.quizWidth || DEFAULT_SETTINGS.quizWidth,
        quizOuterBorderRadius: body.quizOuterBorderRadius || DEFAULT_SETTINGS.quizOuterBorderRadius,
        thankYouHeading: body.thankYouHeading || DEFAULT_SETTINGS.thankYouHeading,
        thankYouBody: body.thankYouBody || DEFAULT_SETTINGS.thankYouBody,
        thankYouColor: body.thankYouColor || DEFAULT_SETTINGS.thankYouColor,
        submitButtonBgColor: body.submitButtonBgColor || DEFAULT_SETTINGS.submitButtonBgColor,
        registrationFormPosition: body.registrationFormPosition || DEFAULT_SETTINGS.registrationFormPosition,
      } as any,

    });

    return { success: true, settings };
  } catch (error: unknown) {
    console.error("[api.settings] Error saving settings:", error);
    return { success: false, error: toUserFacingError(error, GENERIC_SAVE_ERROR) };
  }
};
