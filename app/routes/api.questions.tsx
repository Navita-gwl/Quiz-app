import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { enrichQuestionsWithProducts } from "../utils/enrichment.server";
import { GENERIC_LOAD_ERROR, jsonApiError } from "../utils/userFacingErrors";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    const rawQuestions = await db.question.findMany({
      where: {
        shopId: session.shop,
      },
      orderBy: {
        position: "asc",
      },
    });

    const questions = await enrichQuestionsWithProducts(admin, rawQuestions);

    return Response.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return jsonApiError(error, GENERIC_LOAD_ERROR);
  }
};
