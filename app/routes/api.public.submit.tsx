import type { ActionFunctionArgs } from "react-router";
import { cors } from "../utils/cors";
import db from "../db.server";
import { getRecommendations } from "../utils/recommendations.server";
import {
  guardPublicApi,
  normalizeQuizPublicId,
  resolvePublicQuizCategory,
} from "../utils/publicApi.server";
import { jsonApiError } from "../utils/userFacingErrors";

// Handle OPTIONS preflight + GET email-check
export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return cors(request, new Response(null, { status: 204 }));
  }

  // GET: check if an email has already submitted for this shop
  if (request.method === "GET") {
    const url = new URL(request.url);
    const shopParam = url.searchParams.get("shop");
    const email = url.searchParams.get("email");
    const quizParam =
      url.searchParams.get("quiz")?.trim() || url.searchParams.get("quizId")?.trim();

    if (!email) {
      return cors(request, Response.json({ error: "Missing email" }, { status: 400 }));
    }

    const guard = await guardPublicApi(request, shopParam, "check-email");
    if (guard instanceof Response) return guard;
    const { shop } = guard;

    const resolved = await resolvePublicQuizCategory(request, shop, quizParam);
    if ("error" in resolved) return resolved.error;
    const { category } = resolved;

    const categoryId = category.id;

    const existing = await db.quizSubmission.findFirst({
      where: {
        shopId: shop,
        email: email.trim().toLowerCase(),
        categoryId,
      },
    });

    return cors(request, Response.json({ alreadySubmitted: !!existing }));
  }

  return cors(request, Response.json({ error: "Method not allowed" }, { status: 405 }));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return cors(request, new Response(null, { status: 204 }));
  }

  const url = new URL(request.url);
  const shopQuery = url.searchParams.get("shop");

  try {
    const body = await request.text();
    const data = JSON.parse(body);

    const shopRaw = shopQuery || data.shop;
    const guard = await guardPublicApi(request, shopRaw, "submit");
    if (guard instanceof Response) return guard;
    const { shop } = guard;

    const { name, email, answers, quizId } = data;

    if (!name || !email || !answers || !Array.isArray(answers) || answers.length === 0) {
      return cors(request, Response.json({ error: "Missing required fields" }, { status: 400 }));
    }

    const resolvedQuizId =
      normalizeQuizPublicId(quizId) ||
      normalizeQuizPublicId(url.searchParams.get("quiz")) ||
      normalizeQuizPublicId(url.searchParams.get("quizId"));

    const resolved = await resolvePublicQuizCategory(request, shop, resolvedQuizId);
    if ("error" in resolved) return resolved.error;
    const { category } = resolved;

    const categoryId = category.id;

    // Fetch recommendations — never throw if this fails
    let recommendations: any[] = [];
    try {
      recommendations = await getRecommendations(shop, answers);
    } catch (err) {
      console.error("[Recommendations] Failed (non-fatal):", err);
    }

    // Create submission
    const submission = await db.quizSubmission.create({
      data: { shopId: shop, name, email, categoryId, recommendations },
    });

    // Create answers
    const answerPromises = answers.map(async (answerData: any, index: number) => {
      const { questionId, answer } = answerData;

      if (!questionId || answer === undefined || answer === null) {
        throw new Error(`Invalid answer data at index ${index}`);
      }

      const question = await db.question.findUnique({ where: { id: questionId } });

      if (!question || question.shopId !== shop) {
        throw new Error(`Invalid question: ${questionId} or shop mismatch`);
      }

      return db.answer.create({
        data: {
          shopId: shop,
          questionId,
          questionText: question.text,
          submissionId: submission.id,
          customerId: data.customerId || null,
          answer,
        },
      });
    });

    await Promise.all(answerPromises);

    return cors(
      request,
      Response.json({ success: true, submissionId: submission.id, recommendations })
    );
  } catch (error) {
    console.error("FATAL ERROR in api.public.submit action:", error);
    return cors(
      request,
      jsonApiError(error, "We couldn't submit your quiz answers. Please try again.")
    );
  }
};
