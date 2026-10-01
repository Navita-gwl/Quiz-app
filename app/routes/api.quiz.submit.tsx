import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getRecommendations } from "../utils/recommendations.server";
import { jsonApiError } from "../utils/userFacingErrors";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.text();
    const data = JSON.parse(body);

    if (process.env.NODE_ENV !== "production") {
      const sanitizedData = {
        ...data,
        answers: data.answers?.map((a: any) => ({
          ...a,
          answer:
            typeof a.answer === "string" && a.answer.startsWith("data:image/")
              ? `[Image Data: ...${a.answer.length} chars]`
              : a.answer,
        })),
      };
      console.log("Parsed quiz submission data:", JSON.stringify(sanitizedData, null, 2));
    }

    const { name, email, answers, quizId } = data;

    if (!name || !email || !answers || !Array.isArray(answers) || answers.length === 0) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    let categoryId = null;
    if (quizId && quizId.trim() !== "") {
      const category = await db.category.findUnique({
        where: {
          quizPublicId: quizId.trim(),
        },
      });
      if (category) {
        categoryId = category.id;
      }
    }

    if (!categoryId) {
      const settings = await db.quizSettings.findUnique({
        where: { shopId: session.shop },
      });
      if (settings && settings.hydrogenQuizId && settings.hydrogenQuizId.trim() !== "") {
        const category = await db.category.findUnique({
          where: { quizPublicId: settings.hydrogenQuizId.trim() },
        });
        if (category && category.shopId === session.shop) {
          categoryId = category.id;
        }
      }
    }

    if (!categoryId) {
      const category = await db.category.findFirst({
        where: {
          shopId: session.shop,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      if (category) {
        categoryId = category.id;
      }
    }

    // Fetch recommendations — never throw if this fails
    let recommendations: any[] = [];
    try {
      recommendations = await getRecommendations(session.shop, answers);
    } catch (err) {
      console.error("[Recommendations] Failed (non-fatal):", err);
    }

    const submission = await db.quizSubmission.create({
      data: {
        shopId: session.shop,
        name,
        email,
        categoryId,
        recommendations,
      },
    });

    const answerPromises = answers.map(async (answerData: any, index: number) => {
      const { questionId, answer } = answerData;

      if (!questionId || answer === undefined || answer === null) {
        throw new Error(`Invalid answer data at index ${index}`);
      }

      const question = await db.question.findUnique({ where: { id: questionId } });

      if (!question || question.shopId !== session.shop) {
        throw new Error(`Invalid question: ${questionId}`);
      }

      return db.answer.create({
        data: {
          shopId: session.shop,
          questionId,
          questionText: question.text,
          submissionId: submission.id,
          customerId: data.customerId || null,
          answer,
        },
      });
    });

    await Promise.all(answerPromises);

    return Response.json({ success: true, submissionId: submission.id, recommendations });
  } catch (error) {
    console.error("FATAL ERROR in api.quiz.submit action:", error);
    return jsonApiError(error, "We couldn't submit your quiz answers. Please try again.");
  }
};
